import { Platform } from "react-native";

let analyticsModule: typeof import("@react-native-firebase/analytics") | null = null;
let crashlyticsModule: typeof import("@react-native-firebase/crashlytics") | null = null;

async function loadFirebaseModules() {
  if (Platform.OS === "web") return;
  try {
    analyticsModule = await import("@react-native-firebase/analytics");
    crashlyticsModule = await import("@react-native-firebase/crashlytics");
  } catch (_e) {}
}

export async function initFirebase() {
  await loadFirebaseModules();
  if (crashlyticsModule) {
    try {
      crashlyticsModule.default().setCrashlyticsCollectionEnabled(true);
    } catch (_e) {}
  }
}

export async function logAnalyticsEvent(name: string, params?: Record<string, any>) {
  if (!analyticsModule) return;
  try {
    await analyticsModule.default().logEvent(name, params);
  } catch (_e) {}
}

export async function logScreenView(screenName: string) {
  if (!analyticsModule) return;
  try {
    await analyticsModule.default().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (_e) {}
}

export function recordError(error: Error, context?: string) {
  if (!crashlyticsModule) return;
  try {
    if (context) {
      crashlyticsModule.default().log(context);
    }
    crashlyticsModule.default().recordError(error);
  } catch (_e) {}
}

export function logCrashlyticsMessage(message: string) {
  if (!crashlyticsModule) return;
  try {
    crashlyticsModule.default().log(message);
  } catch (_e) {}
}
