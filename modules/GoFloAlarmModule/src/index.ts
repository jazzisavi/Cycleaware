import { Platform } from 'react-native';
import { NativeModule, requireNativeModule } from 'expo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters for scheduling an interval reminder alarm. */
export interface ReminderAlarmParams {
  reminderId: string;
  reminderTitle: string;
  notes?: string | null;
  repeatInterval: number;
  calendarStartDate?: string | null;
  calendarEndDate?: string | null;
  calendarEndsType: string;
  maxOccurrences?: number | null;
  completedOccurrences: number;
  reminderTime: string;
  soundEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Native module binding
// ---------------------------------------------------------------------------

declare class GoFloAlarmModuleNativeType extends NativeModule {
  scheduleAlarm(params: ReminderAlarmParams): boolean;
  cancelAlarm(reminderId: string): boolean;
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): void;
  scheduleTestAlarm(reminderId: string, delaySeconds: number): boolean;
}

function getNativeModule(): GoFloAlarmModuleNativeType | null {
  if (Platform.OS !== 'android') return null;
  try {
    return requireNativeModule<GoFloAlarmModuleNativeType>('GoFloAlarmModule');
  } catch {
    return null;
  }
}

const Native = getNativeModule();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule an AlarmManager alarm for the given interval reminder rule.
 * Returns true when the alarm was set, false if the schedule is exhausted
 * or the SCHEDULE_EXACT_ALARM permission has not been granted.
 *
 * Android only — no-op on iOS / web.
 */
export function scheduleAlarm(params: ReminderAlarmParams): boolean {
  return Native?.scheduleAlarm(params) ?? false;
}

/**
 * Cancel any pending alarm for the given reminderId.
 * Android only — no-op on iOS / web.
 */
export function cancelAlarm(reminderId: string): boolean {
  return Native?.cancelAlarm(reminderId) ?? false;
}

/**
 * Returns true when the app holds the SCHEDULE_EXACT_ALARM permission.
 * Always returns true on Android < 12.
 * Always returns false on iOS / web.
 */
export function canScheduleExactAlarms(): boolean {
  return Native?.canScheduleExactAlarms() ?? false;
}

/**
 * Open the system "Alarms & Reminders" settings screen (Android 12+).
 * No-op on Android < 12 and on iOS / web.
 */
export function openExactAlarmSettings(): void {
  Native?.openExactAlarmSettings();
}

/**
 * Schedule a test alarm N seconds from now.
 * Used only for PoC device verification — do not call in production.
 */
export function scheduleTestAlarm(reminderId: string, delaySeconds: number): boolean {
  return Native?.scheduleTestAlarm(reminderId, delaySeconds) ?? false;
}
