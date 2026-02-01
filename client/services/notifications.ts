import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function setupNotificationCategories(): Promise<void> {
  if (!isNotificationsAvailable()) {
    console.log("Notifications not available on this platform");
    return;
  }

  try {
    const Notifications = await import("expo-notifications");

    await Notifications.setNotificationCategoryAsync("reminder", [
      {
        identifier: "snooze",
        buttonTitle: "Snooze",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: "skip",
        buttonTitle: "Skip",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: "take",
        buttonTitle: "Take",
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);

    console.log("Notification categories set up successfully");
  } catch (error) {
    console.log("Error setting up notification categories:", error);
  }
}

export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  notes: string | null,
  triggerDate: Date
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
        data: { reminderId },
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
  reminderTitle: string
): Promise<{ success: boolean; message?: string }> {
  if (!isNotificationsAvailable()) {
    return { success: false, message: "Notifications not available" };
  }

  try {
    switch (actionIdentifier) {
      case "snooze": {
        const snoozeDuration = await getSnoozeDuration();
        const snoozeTime = new Date(Date.now() + snoozeDuration * 60 * 1000);
        
        await scheduleReminderNotification(
          reminderId,
          reminderTitle,
          `Snoozed - will remind again in ${snoozeDuration} minutes`,
          snoozeTime
        );
        
        return { 
          success: true, 
          message: `Next reminder in ${snoozeDuration} mins` 
        };
      }
      
      case "skip": {
        return { 
          success: true, 
          message: "Reminder skipped" 
        };
      }
      
      case "take": {
        return { 
          success: true, 
          message: "Marked as taken" 
        };
      }
      
      default:
        return { success: false, message: "Unknown action" };
    }
  } catch (error) {
    console.error("Error handling notification action:", error);
    return { success: false, message: "Error processing action" };
  }
}

export async function setupNotificationResponseListener(
  onAction: (actionId: string, reminderId: string, reminderTitle: string) => Promise<void>
): Promise<(() => void) | null> {
  if (!isNotificationsAvailable()) {
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");

    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const actionIdentifier = response.actionIdentifier;
        const data = response.notification.request.content.data;
        const reminderId = data?.reminderId as string;
        const reminderTitle = response.notification.request.content.title || "";

        if (reminderId && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
          await onAction(actionIdentifier, reminderId, reminderTitle);
        }
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error("Error setting up notification listener:", error);
    return null;
  }
}
