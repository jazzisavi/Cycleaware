import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager";
import { AlarmService } from "./AlarmService";
import { LocalDatabase } from "./LocalDatabase";
import { Copy } from "@/constants/copy";

export const NOTIFICATION_ACTION_TASK = "NOTIFICATION_ACTION_TASK";

const SNOOZE_DURATION_KEY = "@goflo/snooze_duration";
const DEFAULT_SNOOZE_DURATION = 60;
const LAST_PROCESSED_NOTIFICATION_KEY = "@goflo/last_processed_notification";
const processingNotificationIds = new Set<string>();

TaskManager.defineTask(NOTIFICATION_ACTION_TASK, async ({ data, error }: { data?: any; error?: any }) => {
  if (error) {
    console.error("[BG_TASK] NOTIFICATION_ACTION_TASK error:", error);
    return;
  }

  try {
    console.log("[BG_TASK] NOTIFICATION_ACTION_TASK fired with data:", JSON.stringify(data));

    const response = data?.notification?.data?.notificationResponse ?? data?.notificationResponse;
    if (!response) {
      console.log("[BG_TASK] No notification response in task data, skipping");
      return;
    }

    const actionIdentifier: string = response.actionIdentifier ?? "";
    const content = response.notification?.request?.content ?? {};
    const notificationData = content.data ?? {};
    const reminderId: string = notificationData.reminderId ?? "";
    const reminderTitle: string = content.title ?? "";
    const soundEnabled: boolean = notificationData.soundEnabled ?? false;
    const notificationId: string = response.notification?.request?.identifier ?? "";
    const scheduledTime: string | undefined = notificationData.scheduledTime ?? undefined;

    if (!reminderId || !actionIdentifier || actionIdentifier === "expo.modules.notifications.actions.DEFAULT") {
      console.log("[BG_TASK] Skipping — no actionable reminderId or default tap:", actionIdentifier);
      return;
    }

    const lastProcessedId = await AsyncStorage.getItem(LAST_PROCESSED_NOTIFICATION_KEY);
    if (lastProcessedId === notificationId || processingNotificationIds.has(notificationId)) {
      console.log("[BG_TASK] Already processed notification:", notificationId);
      return;
    }

    console.log(`[BG_TASK] Processing action="${actionIdentifier}" reminderId="${reminderId}" notificationId="${notificationId}"`);
    processingNotificationIds.add(notificationId);
    try {
      const result = await handleNotificationAction(actionIdentifier, reminderId, reminderTitle, soundEnabled, notificationId, scheduledTime);
      console.log("[BG_TASK] Action result:", JSON.stringify(result));
      if (result.success) {
        await AsyncStorage.setItem(LAST_PROCESSED_NOTIFICATION_KEY, notificationId);
      }
    } finally {
      processingNotificationIds.delete(notificationId);
    }
  } catch (err) {
    console.error("[BG_TASK] Unexpected error in NOTIFICATION_ACTION_TASK:", err);
  }
});

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function isNotificationsAvailable(): boolean {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android" && isExpoGo()) return false;
  return true;
}

async function dismissNotification(notificationId: string): Promise<void> {
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (_e) {
  }
}

export async function getSnoozeDuration(): Promise<number> {
  try {
    const saved = await AsyncStorage.getItem(SNOOZE_DURATION_KEY);
    if (saved) {
      const duration = parseInt(saved, 10);
      if ([10, 20, 30, 40, 50, 60, 90, 120].includes(duration)) {
        return duration;
      }
    }
  } catch (error) {
    console.log("Error reading snooze duration:", error);
  }
  return DEFAULT_SNOOZE_DURATION;
}

async function cancelRepromptsForReminder(reminderId: string): Promise<void> {
  if (!isNotificationsAvailable()) return;
  try {
    const Notifications = await import("expo-notifications");
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (
        n.content.data?.reminderId === reminderId &&
        n.content.data?.isReprompt === true
      ) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (_e) {}
}

async function cancelNotificationForTimeSlot(reminderId: string, scheduledTime: string): Promise<void> {
  if (!isNotificationsAvailable()) return;
  try {
    const Notifications = await import("expo-notifications");
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const d = n.content.data;
      if (d?.reminderId === reminderId && d?.scheduledTime === scheduledTime) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (_e) {}
}

async function hasRemainingScheduledSlots(reminderId: string): Promise<boolean> {
  if (!isNotificationsAvailable()) return false;
  try {
    const Notifications = await import("expo-notifications");
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(
      (n) => n.content.data?.reminderId === reminderId && !n.content.data?.isReprompt
    );
  } catch (_e) {
    return false;
  }
}

async function handleTakeAction(reminderId: string, reminderTitle: string, scheduledTime?: string): Promise<{ success: boolean; message?: string }> {
  try {
    try {
      if (scheduledTime) {
        await cancelNotificationForTimeSlot(reminderId, scheduledTime);
      } else {
        await cancelPendingNotificationsForReminder(reminderId);
        await cancelRepromptsForReminder(reminderId);
      }
    } catch (_e) {
    }

    const reminder = LocalDatabase.getReminder(reminderId);
    if (!reminder) {
      return { success: false, message: "Reminder not found" };
    }

    let scheduledAt = reminder.nextOccurrence || new Date().toISOString();
    if (scheduledTime && reminder.nextOccurrence) {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const d = new Date(reminder.nextOccurrence);
      d.setHours(hours, minutes, 0, 0);
      scheduledAt = d.toISOString();
    }

    try {
      LocalDatabase.addHistoryEntry({
        reminderId,
        title: reminderTitle,
        scheduledAt,
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    } catch (historyError) {
      console.error("action_take_history_error", historyError);
      return { success: false, message: "Failed to write history entry" };
    }

    const hasMore = await hasRemainingScheduledSlots(reminderId);
    if (!hasMore) {
      const updated = LocalDatabase.updateReminder(reminderId, {
        completedOccurrences: (reminder.completedOccurrences || 0) + 1,
      });
      if (updated?.nextOccurrence) {
        await scheduleAllTimesForReminder(updated);
      }
    }

    return { success: true, message: "taken" };
  } catch (error: any) {
    console.error("action_take_error", error);
    return { success: false, message: "Error marking as taken" };
  }
}

async function handleSkipAction(reminderId: string, scheduledTime?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const reminder = LocalDatabase.getReminder(reminderId);
    if (!reminder) {
      return { success: false, message: "Reminder not found" };
    }

    try {
      if (scheduledTime) {
        await cancelNotificationForTimeSlot(reminderId, scheduledTime);
      } else {
        await cancelRepromptsForReminder(reminderId);
      }
    } catch (_e) {}

    let scheduledAt = reminder.nextOccurrence || new Date().toISOString();
    if (scheduledTime && reminder.nextOccurrence) {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const d = new Date(reminder.nextOccurrence);
      d.setHours(hours, minutes, 0, 0);
      scheduledAt = d.toISOString();
    }

    try {
      LocalDatabase.addHistoryEntry({
        reminderId,
        title: reminder.title,
        scheduledAt,
        status: "skipped",
      });
    } catch (historyError) {
      console.error("action_skip_history_error", historyError);
      return { success: false, message: "Failed to write history entry" };
    }

    const hasMore = await hasRemainingScheduledSlots(reminderId);
    if (!hasMore) {
      const updated = LocalDatabase.updateReminder(reminderId, {});
      if (updated?.nextOccurrence) {
        await scheduleAllTimesForReminder(updated);
      }
    }

    return { success: true, message: "skipped" };
  } catch (error: any) {
    console.error("action_skip_error", error);
    return { success: false, message: "Error skipping reminder" };
  }
}

async function handleSnoozeAction(reminderId: string, reminderTitle: string, soundEnabled: boolean, scheduledTime?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const snoozeDuration = await getSnoozeDuration();
    const snoozeTime = new Date(Date.now() + snoozeDuration * 60 * 1000);

    try {
      if (scheduledTime) {
        await cancelNotificationForTimeSlot(reminderId, scheduledTime);
      } else {
        await cancelRepromptsForReminder(reminderId);
      }
    } catch (_e) {}

    LocalDatabase.addHistoryEntry({
      reminderId,
      title: reminderTitle,
      scheduledAt: new Date().toISOString(),
      status: "snoozed",
    });

    const reminder = LocalDatabase.getReminder(reminderId);
    await scheduleReminderNotification(
      reminderId,
      reminderTitle,
      reminder?.notes || null,
      snoozeTime,
      soundEnabled
    );

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const repromptTime = new Date(snoozeTime.getTime() + 60 * 60 * 1000);
    if (repromptTime <= endOfDay) {
      try {
        const Notifications = await import("expo-notifications");
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Reminder: ${reminderTitle}`,
            body: reminder?.notes || "",
            data: { reminderId, soundEnabled, isReprompt: true },
            categoryIdentifier: "reminder",
            ...(Platform.OS === "android" ? {
              channelId: "reminders",
              priority: Notifications.AndroidNotificationPriority.HIGH,
              style: { type: "bigText", text: reminder?.notes || "" },
            } : {}),
            ...(Platform.OS === "ios" ? { interruptionLevel: "timeSensitive" } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: repromptTime,
          },
        });
      } catch (_e) {}
    }

    return { success: true, message: `snoozed:${snoozeDuration}` };
  } catch (error: any) {
    console.error("action_snooze_error", error);
    return { success: false, message: "Error snoozing reminder" };
  }
}

export async function setupNotificationCategories(): Promise<void> {
  if (!isNotificationsAvailable()) {
    console.log("Notifications not available on this platform");
    return;
  }

  try {
    const Notifications = await import("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log("Android notification channel 'reminders' created with HIGH importance");
    }

    await Notifications.setNotificationCategoryAsync("reminder", [
      {
        identifier: "take",
        buttonTitle: "Take",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: false,
        },
      },
      {
        identifier: "snooze",
        buttonTitle: "Snooze",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: false,
        },
      },
      {
        identifier: "skip",
        buttonTitle: "Skip",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: false,
        },
      },
    ]);

    console.log("Notification categories set up successfully");

    await registerBackgroundNotificationTask();
  } catch (error) {
    console.log("Error setting up notification categories:", error);
  }
}

export async function bootstrapNotifications(
  onAction: (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string, scheduledTime?: string) => Promise<void>
): Promise<(() => void)[]> {
  if (!isNotificationsAvailable()) {
    return [];
  }

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await setupNotificationCategories();

  const cleanups: (() => void)[] = [];
  const receivedCleanup = await setupNotificationReceivedListener();
  if (receivedCleanup) cleanups.push(receivedCleanup);
  const responseCleanup = await setupNotificationResponseListener(onAction);
  if (responseCleanup) cleanups.push(responseCleanup);

  await checkLastNotificationResponse(onAction);
  await syncAllNotifications();

  return cleanups;
}

export async function registerBackgroundNotificationTask(): Promise<void> {
  if (!isNotificationsAvailable()) return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK);
    console.log("[BG_TASK] Registered NOTIFICATION_ACTION_TASK for killed-state actions");
  } catch (error) {
    console.error("[BG_TASK] Failed to register NOTIFICATION_ACTION_TASK:", error);
  }
}

export async function cancelPendingNotificationsForReminder(reminderId: string): Promise<void> {
  if (!isNotificationsAvailable()) {
    return;
  }

  try {
    const Notifications = await import("expo-notifications");
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      if (notification.content.data?.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.error("Error cancelling pending notifications:", error);
  }
}

export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  notes: string | null,
  triggerDate: Date,
  soundEnabled: boolean = false,
  scheduledTime?: string
): Promise<string | null> {
  if (!isNotificationsAvailable()) {
    console.log("Notifications not available, skipping schedule");
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: notes || "",
        data: { reminderId, soundEnabled, ...(scheduledTime ? { scheduledTime } : {}) },
        categoryIdentifier: "reminder",
        ...(Platform.OS === "android" ? {
          channelId: "reminders",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          style: { type: "bigText", text: notes || "" },
        } : {}),
        ...(Platform.OS === "ios" ? { interruptionLevel: "timeSensitive" } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

export async function handleNotificationAction(
  actionIdentifier: string,
  reminderId: string,
  reminderTitle: string,
  soundEnabled: boolean = false,
  notificationId?: string,
  scheduledTime?: string
): Promise<{ success: boolean; message?: string }> {
  await AlarmService.stopAlarm();

  if (notificationId) {
    await dismissNotification(notificationId);
  }

  switch (actionIdentifier) {
    case "take":
      return handleTakeAction(reminderId, reminderTitle, scheduledTime);
    case "skip":
      return handleSkipAction(reminderId, scheduledTime);
    case "snooze":
      return handleSnoozeAction(reminderId, reminderTitle, soundEnabled, scheduledTime);
    case "expo.modules.notifications.actions.DEFAULT":
    default:
      return { success: true, message: "Notification tapped" };
  }
}

export async function checkLastNotificationResponse(
  onAction: (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string, scheduledTime?: string) => Promise<void>
): Promise<void> {
  if (!isNotificationsAvailable()) {
    return;
  }

  try {
    const Notifications = await import("expo-notifications");
    const lastResponse = await Notifications.getLastNotificationResponseAsync();

    if (!lastResponse) return;

    const actionIdentifier = lastResponse.actionIdentifier;
    const data = lastResponse.notification.request.content.data;
    const reminderId = data?.reminderId as string;
    const reminderTitle = lastResponse.notification.request.content.title || "";
    const soundEnabled = (data?.soundEnabled as boolean) || false;
    const notificationId = lastResponse.notification.request.identifier;
    const scheduledTime = (data?.scheduledTime as string) || undefined;

    if (actionIdentifier === "expo.modules.notifications.actions.DEFAULT") {
      return;
    }

    if (!reminderId) {
      return;
    }

    // Dismiss before dedup. Two attempts:
    // 1. Immediate — covers the case where the notification system is ready.
    // 2. Delayed (1500 ms) — on Android cold start, getPresentedNotificationsAsync
    //    can return an empty array before the notification subsystem has fully
    //    re-initialised. The retry runs after the app has settled.
    const dismissMatchingNotifications = async () => {
      try { await Notifications.dismissNotificationAsync(notificationId); } catch (_e) {}
      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        for (const p of presented) {
          const pd = p.request?.content?.data;
          if (pd?.reminderId === reminderId && (scheduledTime ? pd?.scheduledTime === scheduledTime : true)) {
            try { await Notifications.dismissNotificationAsync(p.request.identifier); } catch (_e) {}
          }
        }
      } catch (_e) {}
    };
    await dismissMatchingNotifications();
    setTimeout(() => { dismissMatchingNotifications(); }, 1500);

    // If the reminder was deleted since the notification fired, dismiss already
    // ran above — nothing left to process, return silently.
    if (!LocalDatabase.getReminder(reminderId)) {
      return;
    }

    const lastProcessedId = await AsyncStorage.getItem(LAST_PROCESSED_NOTIFICATION_KEY);
    if (lastProcessedId === notificationId || processingNotificationIds.has(notificationId)) {
      return;
    }

    processingNotificationIds.add(notificationId);
    try {
      await onAction(actionIdentifier, reminderId, reminderTitle, soundEnabled, notificationId, scheduledTime);
      await AsyncStorage.setItem(LAST_PROCESSED_NOTIFICATION_KEY, notificationId);
    } finally {
      processingNotificationIds.delete(notificationId);
    }
  } catch (error) {
    console.error("Error checking last notification response:", error);
  }
}

export async function setupNotificationReceivedListener(): Promise<(() => void) | null> {
  if (!isNotificationsAvailable()) {
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    const subscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data;
        const soundEnabled = data?.soundEnabled as boolean;

        if (soundEnabled) {
          await AlarmService.playAlarm();
        }
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error("Error setting up notification received listener:", error);
    return null;
  }
}

export async function setupNotificationResponseListener(
  onAction: (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string, scheduledTime?: string) => Promise<void>
): Promise<(() => void) | null> {
  if (!isNotificationsAvailable()) {
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          await AlarmService.stopAlarm();

          const actionIdentifier = response.actionIdentifier;
          const data = response.notification.request.content.data;
          const reminderId = data?.reminderId as string;
          const reminderTitle = response.notification.request.content.title || "";
          const soundEnabled = data?.soundEnabled as boolean || false;
          const notificationId = response.notification.request.identifier;
          const scheduledTime = (data?.scheduledTime as string) || undefined;

          if (reminderId) {
            try { await Notifications.dismissNotificationAsync(notificationId); } catch (_e) {}
            try {
              const presented = await Notifications.getPresentedNotificationsAsync();
              for (const p of presented) {
                const pd = p.request?.content?.data;
                if (pd?.reminderId === reminderId && (scheduledTime ? pd?.scheduledTime === scheduledTime : true)) {
                  try { await Notifications.dismissNotificationAsync(p.request.identifier); } catch (_e) {}
                }
              }
            } catch (_e) {}

            const lastProcessedId = await AsyncStorage.getItem(LAST_PROCESSED_NOTIFICATION_KEY);
            if (lastProcessedId === notificationId || processingNotificationIds.has(notificationId)) {
              return;
            }

            processingNotificationIds.add(notificationId);
            try {
              await onAction(actionIdentifier, reminderId, reminderTitle, soundEnabled, notificationId, scheduledTime);
              await AsyncStorage.setItem(LAST_PROCESSED_NOTIFICATION_KEY, notificationId);
            } finally {
              processingNotificationIds.delete(notificationId);
            }
          }
        } catch (error) {
          console.error("Error handling notification response:", error);
        }
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error("Error setting up notification listener:", error);
    return null;
  }
}

function getScheduleDatesForReminder(reminder: { nextOccurrence: string | null; reminderTimes: string[] | null; reminderTime: string }): Date[] {
  if (!reminder.nextOccurrence) return [];

  const baseDate = new Date(reminder.nextOccurrence);
  const times = reminder.reminderTimes && reminder.reminderTimes.length > 0
    ? reminder.reminderTimes
    : [reminder.reminderTime];

  const now = new Date();
  const dates: Date[] = [];

  for (const time of times) {
    const [hours, minutes] = time.split(":").map(Number);
    const scheduleDate = new Date(baseDate);
    scheduleDate.setHours(hours, minutes, 0, 0);
    if (scheduleDate > now) {
      dates.push(scheduleDate);
    }
  }

  return dates;
}

export async function scheduleAllTimesForReminder(reminder: {
  id: string;
  title: string;
  notes: string | null;
  nextOccurrence: string | null;
  reminderTimes: string[] | null;
  reminderTime: string;
  soundEnabled: boolean;
}): Promise<void> {
  if (!isNotificationsAvailable()) return;
  if (!reminder.nextOccurrence) return;

  const times = reminder.reminderTimes && reminder.reminderTimes.length > 0
    ? reminder.reminderTimes
    : [reminder.reminderTime];

  const baseDate = new Date(reminder.nextOccurrence);
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const slotTime of times) {
    const [hours, minutes] = slotTime.split(":").map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);

    if (date <= now) continue;

    await scheduleReminderNotification(
      reminder.id,
      reminder.title,
      reminder.notes,
      date,
      reminder.soundEnabled,
      slotTime
    );

    if (date <= twentyFourHoursFromNow) {
      const repromptTime = new Date(date.getTime() + 60 * 60 * 1000);
      if (repromptTime <= endOfDay && repromptTime > now) {
        try {
          const Notifications = await import("expo-notifications");
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Reminder: ${reminder.title}`,
              body: reminder.notes || "",
              data: {
                reminderId: reminder.id,
                soundEnabled: reminder.soundEnabled,
                isReprompt: true,
                scheduledTime: slotTime,
              },
              categoryIdentifier: "reminder",
              ...(Platform.OS === "android" ? {
                channelId: "reminders",
                priority: Notifications.AndroidNotificationPriority.HIGH,
                style: { type: "bigText", text: reminder.notes || "" },
              } : {}),
              ...(Platform.OS === "ios" ? { interruptionLevel: "timeSensitive" } : {}),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: repromptTime,
            },
          });
        } catch (error) {
          console.error("Error scheduling re-prompt:", error);
        }
      }
    }
  }
}

const BUFFER_DAYS = 5;
const WARNING_DAYS_BEFORE_END = 1;

function checkCycleDayLocal(
  cycleDayStart: number,
  cycleDayEnd: number,
  cycleStartDate: Date,
  cycleEndDate: Date | null,
  checkDate: Date
): { isActiveDay: boolean; currentCycleDay: number; nextActiveDate: Date | null } {
  const cycleLength = cycleDayEnd;
  const startDateOnly = new Date(cycleStartDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const checkDateOnly = new Date(checkDate);
  checkDateOnly.setHours(0, 0, 0, 0);

  if (cycleEndDate) {
    const endDateOnly = new Date(cycleEndDate);
    endDateOnly.setHours(0, 0, 0, 0);
    if (checkDateOnly > endDateOnly) {
      return { isActiveDay: false, currentCycleDay: 0, nextActiveDate: null };
    }
  }

  if (checkDateOnly < startDateOnly) {
    const nextActiveDate = new Date(startDateOnly);
    nextActiveDate.setDate(nextActiveDate.getDate() + (cycleDayStart - 1));
    return { isActiveDay: false, currentCycleDay: 0, nextActiveDate };
  }

  const daysSinceStart = Math.floor((checkDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  const dayInCurrentCycle = (daysSinceStart % cycleLength) + 1;
  const isActiveDay = dayInCurrentCycle >= cycleDayStart && dayInCurrentCycle <= cycleDayEnd;

  if (isActiveDay) {
    return { isActiveDay: true, currentCycleDay: dayInCurrentCycle, nextActiveDate: new Date(checkDateOnly) };
  } else if (dayInCurrentCycle < cycleDayStart) {
    const daysUntil = cycleDayStart - dayInCurrentCycle;
    const nextActive = new Date(checkDateOnly);
    nextActive.setDate(nextActive.getDate() + daysUntil);
    return { isActiveDay: false, currentCycleDay: dayInCurrentCycle, nextActiveDate: nextActive };
  } else {
    const daysLeft = cycleLength - dayInCurrentCycle;
    const daysUntil = daysLeft + cycleDayStart;
    const nextActive = new Date(checkDateOnly);
    nextActive.setDate(nextActive.getDate() + daysUntil);
    return { isActiveDay: false, currentCycleDay: dayInCurrentCycle, nextActiveDate: nextActive };
  }
}

function getCycleBufferDates(reminder: {
  cycleDayStart: number | null;
  cycleDayEnd: number | null;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  reminderTime: string;
  reminderTimes: string[] | null;
}): { date: Date; cycleDay: number }[] {
  if (!reminder.cycleDayStart || !reminder.cycleDayEnd || !reminder.cycleStartDate) return [];

  const times = reminder.reminderTimes && reminder.reminderTimes.length > 0
    ? reminder.reminderTimes
    : [reminder.reminderTime];
  const now = new Date();
  const entries: { date: Date; cycleDay: number }[] = [];

  for (let dayOffset = 0; dayOffset <= BUFFER_DAYS; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    checkDate.setHours(0, 0, 0, 0);

    const { isActiveDay, currentCycleDay } = checkCycleDayLocal(
      reminder.cycleDayStart,
      reminder.cycleDayEnd,
      new Date(reminder.cycleStartDate),
      reminder.cycleEndDate ? new Date(reminder.cycleEndDate) : null,
      checkDate
    );

    if (!isActiveDay) continue;

    for (const time of times) {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduleDate = new Date(checkDate);
      scheduleDate.setHours(hours, minutes, 0, 0);
      if (scheduleDate > now) {
        entries.push({ date: scheduleDate, cycleDay: currentCycleDay });
      }
    }
  }

  return entries;
}

async function scheduleBufferWarning(reminder: {
  id: string;
  cycleDayStart: number | null;
  cycleDayEnd: number | null;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  reminderTime: string;
}): Promise<void> {
  if (!isNotificationsAvailable()) return;

  try {
    const Notifications = await import("expo-notifications");

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + BUFFER_DAYS - WARNING_DAYS_BEFORE_END);
    const [hours, minutes] = reminder.reminderTime.split(":").map(Number);
    warningDate.setHours(hours, minutes, 0, 0);

    if (warningDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: Copy.offlineBuffer.warningTitle,
        body: Copy.offlineBuffer.warningBody,
        data: { type: "buffer_warning", reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: warningDate,
      },
    });

    console.log(`Scheduled buffer warning for ${warningDate.toISOString()}`);
  } catch (error) {
    console.error("Error scheduling buffer warning:", error);
  }
}

export async function syncAllNotifications(): Promise<void> {
  if (!isNotificationsAvailable()) {
    return;
  }

  try {
    const Notifications = await import("expo-notifications");
    await Notifications.cancelAllScheduledNotificationsAsync();

    LocalDatabase.initDatabase();
    const reminders = LocalDatabase.getAllReminders();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const history = LocalDatabase.getHistory();

    for (const reminder of reminders) {
      if (!reminder.isActive || !reminder.nextOccurrence) continue;
      if (reminder.reminderType === "cycle") continue;

      const nextDate = new Date(reminder.nextOccurrence);
      nextDate.setHours(0, 0, 0, 0);

      if (nextDate < todayStart) {
        const missedDateStr = reminder.nextOccurrence;
        const hasHistoryForDate = history.some((h) => {
          if (h.reminderId !== reminder.id) return false;
          const hDate = new Date(h.scheduledAt);
          hDate.setHours(0, 0, 0, 0);
          return hDate.getTime() === nextDate.getTime();
        });

        if (!hasHistoryForDate) {
          LocalDatabase.addHistoryEntry({
            reminderId: reminder.id,
            title: reminder.title,
            scheduledAt: missedDateStr,
            status: "missed",
          });
        }
      }
    }

    let cycleBufferScheduled = false;

    for (const reminder of reminders) {
      if (!reminder.isActive) continue;

      if (reminder.reminderType === "cycle") {
        await cancelPendingNotificationsForReminder(reminder.id);

        const bufferDates = getCycleBufferDates(reminder);
        for (const { date, cycleDay } of bufferDates) {
          await scheduleReminderNotification(
            reminder.id,
            `Day ${cycleDay} - ${reminder.title}`,
            reminder.notes,
            date,
            reminder.soundEnabled
          );
        }

        if (bufferDates.length > 0 && !cycleBufferScheduled) {
          await scheduleBufferWarning(reminder);
          cycleBufferScheduled = true;
        }

        if (!reminder.nextOccurrence) {
          LocalDatabase.updateReminder(reminder.id, {});
        }

        continue;
      }

      if (!reminder.nextOccurrence) continue;

      const nextDate = new Date(reminder.nextOccurrence);
      const nextDateDay = new Date(nextDate);
      nextDateDay.setHours(0, 0, 0, 0);
      if (nextDateDay < todayStart) {
        LocalDatabase.updateReminder(reminder.id, {});
        const updated = LocalDatabase.getReminder(reminder.id);
        if (updated?.nextOccurrence) {
          await cancelPendingNotificationsForReminder(reminder.id);
          await scheduleAllTimesForReminder(updated);
        }
      } else {
        await cancelPendingNotificationsForReminder(reminder.id);
        await scheduleAllTimesForReminder(reminder);
      }
    }

    console.log(`Synced notifications for ${reminders.filter(r => r.isActive).length} active reminders`);
  } catch (error) {
    console.error("Error syncing notifications:", error);
  }
}

export async function stopAlarm(): Promise<void> {
  await AlarmService.stopAlarm();
}
