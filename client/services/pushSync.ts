import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { LocalDatabase, LocalReminder } from "./LocalDatabase";
import { Copy } from "@/constants/copy";

const PUSH_TOKEN_ID_KEY = "@goflo/push_token_id";
const PUSH_TOKEN_KEY = "@goflo/push_token";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function isPushAvailable(): boolean {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android" && isExpoGo()) return false;
  return true;
}

async function isOnline(): Promise<boolean> {
  try {
    const baseUrl = getApiUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(new URL("/api/debug-log", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "ping" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function registerPushToken(): Promise<string | null> {
  if (!isPushAvailable()) return null;

  try {
    const Notifications = await import("expo-notifications");

    const { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      console.log("[PushSync] Push permission not granted");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    const token = tokenData.data;

    const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    const savedTokenId = await AsyncStorage.getItem(PUSH_TOKEN_ID_KEY);

    if (savedToken === token && savedTokenId) {
      return savedTokenId;
    }

    const baseUrl = getApiUrl();
    const response = await fetch(new URL("/api/push-token", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    if (!response.ok) {
      console.error("[PushSync] Failed to register token:", response.status);
      return null;
    }

    const result = await response.json();
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    await AsyncStorage.setItem(PUSH_TOKEN_ID_KEY, result.id);

    console.log(`[PushSync] Token registered: ${result.status}`);
    return result.id;
  } catch (error) {
    console.error("[PushSync] Token registration error:", error);
    return null;
  }
}

export async function syncCycleConfigsToServer(pushTokenId?: string | null): Promise<void> {
  if (!isPushAvailable()) return;

  try {
    const online = await isOnline();
    if (!online) {
      console.log("[PushSync] Offline, skipping cycle config sync");
      return;
    }

    let tokenId = pushTokenId;
    if (!tokenId) {
      tokenId = await AsyncStorage.getItem(PUSH_TOKEN_ID_KEY);
    }
    if (!tokenId) {
      tokenId = await registerPushToken();
    }
    if (!tokenId) {
      console.log("[PushSync] No push token ID available, skipping sync");
      return;
    }

    const allReminders = LocalDatabase.getAllReminders();
    const cycleReminders = allReminders.filter(
      (r) => r.reminderType === "cycle" && r.isActive
    );

    const configs = cycleReminders.map((r) => ({
      id: r.id,
      title: r.title,
      notes: r.notes,
      cycleDayStart: r.cycleDayStart,
      cycleDayEnd: r.cycleDayEnd,
      cycleStartDate: r.cycleStartDate,
      cycleEndDate: r.cycleEndDate,
      reminderTimes: r.reminderTimes || [r.reminderTime],
      soundEnabled: r.soundEnabled,
      isActive: r.isActive,
    }));

    const baseUrl = getApiUrl();
    const response = await fetch(new URL("/api/cycle-configs/sync", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushTokenId: tokenId, configs }),
    });

    if (!response.ok) {
      console.error("[PushSync] Sync failed:", response.status);
      return;
    }

    const result = await response.json();
    console.log(`[PushSync] Synced ${result.synced} cycle configs`);
  } catch (error) {
    console.error("[PushSync] Sync error:", error);
  }
}

export async function syncSingleCycleReminder(reminder: LocalReminder): Promise<void> {
  if (!isPushAvailable()) return;
  if (reminder.reminderType !== "cycle") return;

  try {
    const online = await isOnline();
    if (!online) return;

    await syncCycleConfigsToServer();
  } catch (error) {
    console.error("[PushSync] Single reminder sync error:", error);
  }
}

export async function onAppLaunchSync(): Promise<void> {
  if (!isPushAvailable()) return;

  try {
    const tokenId = await registerPushToken();
    if (tokenId) {
      await syncCycleConfigsToServer(tokenId);
    }
  } catch (error) {
    console.error("[PushSync] App launch sync error:", error);
  }
}
