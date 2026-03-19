import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFICATION_BG_TASK_NAME = "GOFLO_NOTIFICATION_BG_TASK";
const BG_TASK_LOG_KEY = "@goflo/bg_task_log";

interface NotificationRequestContent {
  data?: {
    reminderId?: string;
    [key: string]: unknown;
  };
}

interface NotificationRequest {
  identifier?: string;
  content?: NotificationRequestContent;
}

interface NotificationPayload {
  request?: NotificationRequest;
}

interface NotificationBgTaskData {
  notification?: NotificationPayload;
  identifier?: string;
  actionIdentifier?: string;
}

function isNotificationBgTaskData(value: unknown): value is NotificationBgTaskData {
  return typeof value === "object" && value !== null;
}

export async function readBackgroundTaskLog(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BG_TASK_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (_e) {
    return [];
  }
}

async function appendLog(entry: string): Promise<void> {
  try {
    const existing = await readBackgroundTaskLog();
    const updated = [...existing, entry].slice(-50);
    await AsyncStorage.setItem(BG_TASK_LOG_KEY, JSON.stringify(updated));
  } catch (_e) {}
}

TaskManager.defineTask(NOTIFICATION_BG_TASK_NAME, async ({ data, error }) => {
  const timestamp = new Date().toISOString();

  if (error) {
    await appendLog(`[${timestamp}] BG_TASK ERROR: ${JSON.stringify(error)}`);
    return;
  }

  await appendLog(`[${timestamp}] BG_TASK FIRED: ${JSON.stringify(data)}`);

  try {
    const Notifications = await import("expo-notifications");

    if (!isNotificationBgTaskData(data)) {
      await appendLog(`[${timestamp}] BG_TASK unexpected data shape`);
      return;
    }

    const notificationId: string | undefined =
      data.notification?.request?.identifier ?? data.identifier;

    const reminderId: string | undefined =
      data.notification?.request?.content?.data?.reminderId;

    const actionIdentifier: string | undefined = data.actionIdentifier;

    if (actionIdentifier && actionIdentifier !== "expo.modules.notifications.actions.DEFAULT") {
      await appendLog(`[${timestamp}] BG_TASK action=${actionIdentifier} reminderId=${reminderId}`);

      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        for (const p of presented) {
          const pd = p.request?.content?.data;
          if (reminderId && typeof pd?.reminderId === "string" && pd.reminderId === reminderId) {
            try {
              await Notifications.dismissNotificationAsync(p.request.identifier);
              await appendLog(`[${timestamp}] BG_TASK dismissed presented id=${p.request.identifier}`);
            } catch (_e) {}
          }
        }
      } catch (_e) {}

      if (notificationId) {
        try {
          await Notifications.dismissNotificationAsync(notificationId);
          await appendLog(`[${timestamp}] BG_TASK dismissed by id=${notificationId}`);
        } catch (_e) {}
      }
    }
  } catch (dismissError) {
    await appendLog(`[${timestamp}] BG_TASK dismiss error: ${JSON.stringify(dismissError)}`);
  }
});
