import { Platform } from "react-native";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

if (Platform.OS !== "web") {
  try {
    const TaskManager = require("expo-task-manager");

    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
      if (error) {
        console.error("[BackgroundTask] Error:", error);
        return;
      }

      if (!data) return;

      try {
        const { actionIdentifier, notification } = data;
        const content = notification?.request?.content;
        const reminderId = content?.data?.reminderId as string;
        const reminderTitle = content?.title || "";
        const soundEnabled = (content?.data?.soundEnabled as boolean) || false;

        if (!reminderId) return;

        if (actionIdentifier === "expo.modules.notifications.actions.DEFAULT") {
          return;
        }

        const { LocalDatabase } = require("./LocalDatabase");
        LocalDatabase.initDatabase();

        const Notifications = require("expo-notifications");

        const cancelAllForReminder = async (rid: string) => {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          for (const n of scheduled) {
            if (n.content.data?.reminderId === rid) {
              await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
          }
        };

        const { scheduleAllTimesForReminder } = require("./notifications");

        if (actionIdentifier === "take") {
          const reminder = LocalDatabase.getReminder(reminderId);
          if (!reminder) return;

          await cancelAllForReminder(reminderId);

          LocalDatabase.addHistoryEntry({
            reminderId,
            title: reminderTitle,
            scheduledAt: reminder.nextOccurrence || new Date().toISOString(),
            status: "completed",
            completedAt: new Date().toISOString(),
          });

          const updated = LocalDatabase.updateReminder(reminderId, {
            completedOccurrences: (reminder.completedOccurrences || 0) + 1,
          });

          if (updated?.nextOccurrence) {
            await scheduleAllTimesForReminder(updated);
          }
        } else if (actionIdentifier === "skip") {
          const reminder = LocalDatabase.getReminder(reminderId);
          if (!reminder) return;

          await cancelAllForReminder(reminderId);

          LocalDatabase.addHistoryEntry({
            reminderId,
            title: reminder.title,
            scheduledAt: reminder.nextOccurrence || new Date().toISOString(),
            status: "skipped",
          });

          const updated = LocalDatabase.updateReminder(reminderId, {});

          if (updated?.nextOccurrence) {
            await scheduleAllTimesForReminder(updated);
          }
        } else if (actionIdentifier === "snooze") {
          const { getSnoozeDuration } = require("./notifications");
          const snoozeDuration = await getSnoozeDuration();
          const snoozeTime = new Date(Date.now() + snoozeDuration * 60 * 1000);

          await cancelAllForReminder(reminderId);

          LocalDatabase.addHistoryEntry({
            reminderId,
            title: reminderTitle,
            scheduledAt: new Date().toISOString(),
            status: "snoozed",
          });

          const reminder = LocalDatabase.getReminder(reminderId);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: reminderTitle,
              body: reminder?.notes || "",
              data: { reminderId, soundEnabled },
              categoryIdentifier: "reminder",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: snoozeTime,
            },
          });

          const now = new Date();
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          const repromptTime = new Date(snoozeTime.getTime() + 60 * 60 * 1000);
          if (repromptTime <= endOfDay) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `Reminder: ${reminderTitle}`,
                body: reminder?.notes || "",
                data: { reminderId, soundEnabled, isReprompt: true },
                categoryIdentifier: "reminder",
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: repromptTime,
              },
            });
          }
        }

        console.log(`[BackgroundTask] Processed action: ${actionIdentifier} for reminder: ${reminderId}`);
      } catch (err) {
        console.error("[BackgroundTask] Processing error:", err);
      }
    });
  } catch (e) {
    console.log("[BackgroundTask] TaskManager not available:", e);
  }
}

export async function registerBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const Notifications = await import("expo-notifications");
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log("[BackgroundTask] Registered background notification task");
  } catch (error: any) {
    if (error?.message?.includes("already registered")) {
      console.log("[BackgroundTask] Task already registered");
      return;
    }
    console.error("[BackgroundTask] Failed to register:", error);
  }
}

export { BACKGROUND_NOTIFICATION_TASK };
