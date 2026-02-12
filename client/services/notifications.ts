import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlarmService } from "./AlarmService";

function getNotificationApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) {
    host = "cycle-reminder.replit.app";
  }
  return `https://${host}`;
}

const SNOOZE_DURATION_KEY = "@goflo/snooze_duration";
const DEFAULT_SNOOZE_DURATION = 60;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function isNotificationsAvailable(): boolean {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android" && isExpoGo()) return false;
  return true;
}

async function logToServer(event: string, data: Record<string, any> = {}): Promise<void> {
  try {
    const baseUrl = getNotificationApiUrl();
    const url = `${baseUrl}/api/debug-log`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data, timestamp: new Date().toISOString(), platform: Platform.OS }),
    });
  } catch (_e) {
  }
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

async function handleTakeAction(reminderId: string, reminderTitle: string): Promise<{ success: boolean; message?: string }> {
  await logToServer("action_take_start", { reminderId });
  try {
    try {
      await cancelPendingNotificationsForReminder(reminderId);
    } catch (_e) {
    }

    const baseUrl = getNotificationApiUrl();
    const url = `${baseUrl}/api/reminders/${reminderId}/complete`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      await logToServer("action_take_success", { reminderId });
      return { success: true, message: "Marked as taken" };
    } else {
      const body = await response.text().catch(() => "");
      await logToServer("action_take_failed", { reminderId, status: response.status, body });
      return { success: false, message: "Failed to mark as taken" };
    }
  } catch (apiError: any) {
    await logToServer("action_take_error", { reminderId, error: apiError?.message || String(apiError) });
    return { success: false, message: "Error marking as taken" };
  }
}

async function handleSkipAction(reminderId: string): Promise<{ success: boolean; message?: string }> {
  await logToServer("action_skip_start", { reminderId });
  try {
    const baseUrl = getNotificationApiUrl();
    const url = `${baseUrl}/api/reminders/${reminderId}/skip`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      await logToServer("action_skip_success", { reminderId });
      return { success: true, message: "Reminder skipped" };
    } else {
      const body = await response.text().catch(() => "");
      await logToServer("action_skip_failed", { reminderId, status: response.status, body });
      return { success: false, message: "Failed to skip reminder" };
    }
  } catch (apiError: any) {
    await logToServer("action_skip_error", { reminderId, error: apiError?.message || String(apiError) });
    return { success: false, message: "Error skipping reminder" };
  }
}

async function handleSnoozeAction(reminderId: string, reminderTitle: string, soundEnabled: boolean): Promise<{ success: boolean; message?: string }> {
  await logToServer("action_snooze_start", { reminderId });
  try {
    const snoozeDuration = await getSnoozeDuration();
    const snoozeTime = new Date(Date.now() + snoozeDuration * 60 * 1000);

    await scheduleReminderNotification(
      reminderId,
      reminderTitle,
      `Snoozed - will remind again in ${snoozeDuration} minutes`,
      snoozeTime,
      soundEnabled
    );

    await logToServer("action_snooze_done", { reminderId, snoozeDuration });
    return { success: true, message: `Next reminder in ${snoozeDuration} mins` };
  } catch (error: any) {
    await logToServer("action_snooze_error", { reminderId, error: error?.message || String(error) });
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

    await Notifications.setNotificationCategoryAsync("reminder", [
      {
        identifier: "take",
        buttonTitle: "Take",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: true,
        },
      },
      {
        identifier: "snooze",
        buttonTitle: "Snooze",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: true,
        },
      },
      {
        identifier: "skip",
        buttonTitle: "Skip",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
          opensAppToForeground: true,
        },
      },
    ]);

    console.log("Notification categories set up successfully");
  } catch (error) {
    console.log("Error setting up notification categories:", error);
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
  soundEnabled: boolean = false
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
        body: notes || "Time for your reminder",
        data: { reminderId, soundEnabled },
        categoryIdentifier: "reminder",
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
  notificationId?: string
): Promise<{ success: boolean; message?: string }> {
  await logToServer("action_received", { actionIdentifier, reminderId, reminderTitle });

  await AlarmService.stopAlarm();

  if (notificationId) {
    await dismissNotification(notificationId);
  }

  switch (actionIdentifier) {
    case "take":
      return handleTakeAction(reminderId, reminderTitle);
    case "skip":
      return handleSkipAction(reminderId);
    case "snooze":
      return handleSnoozeAction(reminderId, reminderTitle, soundEnabled);
    case "expo.modules.notifications.actions.DEFAULT":
    default:
      await logToServer("action_default", { actionIdentifier, reminderId });
      return { success: true, message: "Notification tapped" };
  }
}

export async function checkLastNotificationResponse(
  onAction: (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string) => Promise<void>
): Promise<void> {
  if (!isNotificationsAvailable()) {
    return;
  }

  try {
    const Notifications = await import("expo-notifications");
    const lastResponse = await Notifications.getLastNotificationResponseAsync();

    if (lastResponse) {
      const actionIdentifier = lastResponse.actionIdentifier;
      const data = lastResponse.notification.request.content.data;
      const reminderId = data?.reminderId as string;
      const reminderTitle = lastResponse.notification.request.content.title || "";
      const soundEnabled = data?.soundEnabled as boolean || false;
      const notificationId = lastResponse.notification.request.identifier;

      await logToServer("last_response_check", { actionIdentifier, reminderId, notificationId });

      if (reminderId && actionIdentifier !== "expo.modules.notifications.actions.DEFAULT") {
        await onAction(actionIdentifier, reminderId, reminderTitle, soundEnabled, notificationId);
      }
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
  onAction: (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string) => Promise<void>
): Promise<(() => void) | null> {
  if (!isNotificationsAvailable()) {
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        await AlarmService.stopAlarm();

        const actionIdentifier = response.actionIdentifier;
        const data = response.notification.request.content.data;
        const reminderId = data?.reminderId as string;
        const reminderTitle = response.notification.request.content.title || "";
        const soundEnabled = data?.soundEnabled as boolean || false;
        const notificationId = response.notification.request.identifier;

        await logToServer("response_listener_fired", { actionIdentifier, reminderId, notificationId });

        if (reminderId) {
          await onAction(actionIdentifier, reminderId, reminderTitle, soundEnabled, notificationId);
        } else {
          await logToServer("response_listener_no_reminder_id", { actionIdentifier, data });
        }
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error("Error setting up notification listener:", error);
    return null;
  }
}

export async function stopAlarm(): Promise<void> {
  await AlarmService.stopAlarm();
}
