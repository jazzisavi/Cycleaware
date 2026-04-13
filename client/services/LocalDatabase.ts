import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateNextOccurrence } from './reminderCalculator';

const isWeb = Platform.OS === 'web';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

let db: any = null;

function getDb(): any {
  if (!db) {
    if (isWeb) {
      throw new Error('SQLite is not supported on web');
    }
    const SQLite = require('expo-sqlite');
    db = SQLite.openDatabaseSync('goflo.db');
  }
  return db;
}

const WEB_REMINDERS_KEY = 'goflo_reminders';
const WEB_HISTORY_KEY = 'goflo_history';
const WEB_SETTINGS_KEY = 'goflo_settings';

let webReminders: LocalReminder[] = [];
let webHistory: LocalHistoryEntry[] = [];
let webSettings: Record<string, string> = {};
let webDataLoaded = false;

async function loadWebData() {
  if (webDataLoaded) return;
  try {
    const [r, h, s] = await Promise.all([
      AsyncStorage.getItem(WEB_REMINDERS_KEY),
      AsyncStorage.getItem(WEB_HISTORY_KEY),
      AsyncStorage.getItem(WEB_SETTINGS_KEY),
    ]);
    if (r) webReminders = JSON.parse(r);
    if (h) webHistory = JSON.parse(h);
    if (s) webSettings = JSON.parse(s);
  } catch (e) {
    console.warn('Failed to load web data:', e);
  }
  webDataLoaded = true;
}

function saveWebReminders() {
  AsyncStorage.setItem(WEB_REMINDERS_KEY, JSON.stringify(webReminders)).catch(() => {});
}

function saveWebHistory() {
  AsyncStorage.setItem(WEB_HISTORY_KEY, JSON.stringify(webHistory)).catch(() => {});
}

function saveWebSettings() {
  AsyncStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(webSettings)).catch(() => {});
}

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export interface LocalReminder {
  id: string;
  title: string;
  notes: string | null;
  reminderType: 'cycle' | 'calendar';
  cycleIntervalDays: number | null;
  cycleDayStart: number | null;
  cycleDayEnd: number | null;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  weeklyRepeatDays: string[] | null;
  repeatInterval: number;
  repeatUnit: string;
  calendarStartDate: string | null;
  calendarEndDate: string | null;
  calendarEndsType: string;
  maxOccurrences: number | null;
  completedOccurrences: number;
  specificDates: string[] | null;
  reminderTime: string;
  reminderTimes: string[] | null;
  alarmType: string;
  soundEnabled: boolean;
  nextOccurrence: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalHistoryEntry {
  id: string;
  reminderId: string;
  title: string;
  scheduledAt: string;
  status: string;
  snoozedUntil: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateReminderInput {
  title: string;
  notes?: string | null;
  reminderType: 'cycle' | 'calendar';
  cycleIntervalDays?: number | null;
  cycleDayStart?: number | null;
  cycleDayEnd?: number | null;
  cycleStartDate?: string | null;
  cycleEndDate?: string | null;
  weeklyRepeatDays?: string[] | null;
  repeatInterval?: number;
  repeatUnit?: string;
  calendarStartDate?: string | null;
  calendarEndDate?: string | null;
  calendarEndsType?: string;
  maxOccurrences?: number | null;
  completedOccurrences?: number;
  specificDates?: string[] | null;
  reminderTime: string;
  reminderTimes?: string[] | null;
  alarmType?: string;
  soundEnabled?: boolean;
  isActive?: boolean;
}


function rowToReminder(row: any): LocalReminder {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? null,
    reminderType: row.reminder_type as 'cycle' | 'calendar',
    cycleIntervalDays: row.cycle_interval_days ?? null,
    cycleDayStart: row.cycle_day_start ?? null,
    cycleDayEnd: row.cycle_day_end ?? null,
    cycleStartDate: row.cycle_start_date ?? null,
    cycleEndDate: row.cycle_end_date ?? null,
    weeklyRepeatDays: row.weekly_repeat_days ? JSON.parse(row.weekly_repeat_days) : null,
    repeatInterval: row.repeat_interval ?? 1,
    repeatUnit: row.repeat_unit ?? 'week',
    calendarStartDate: row.calendar_start_date ?? null,
    calendarEndDate: row.calendar_end_date ?? null,
    calendarEndsType: row.calendar_ends_type ?? 'never',
    maxOccurrences: row.max_occurrences ?? null,
    completedOccurrences: row.completed_occurrences ?? 0,
    specificDates: row.specific_dates ? JSON.parse(row.specific_dates) : null,
    reminderTime: row.reminder_time,
    reminderTimes: row.reminder_times ? JSON.parse(row.reminder_times) : null,
    alarmType: row.alarm_type ?? 'notification',
    soundEnabled: row.sound_enabled === 1,
    nextOccurrence: row.next_occurrence ?? null,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHistory(row: any): LocalHistoryEntry {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    status: row.status,
    snoozedUntil: row.snoozed_until ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  };
}

export const LocalDatabase = {
  subscribe(listener: Listener): void {
    listeners.add(listener);
  },

  unsubscribe(listener: Listener): void {
    listeners.delete(listener);
  },

  initDatabase(): void {
    if (isWeb) {
      loadWebData().then(() => notifyListeners());
      return;
    }
    getDb().execSync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        reminder_type TEXT NOT NULL,
        cycle_interval_days INTEGER,
        cycle_day_start INTEGER,
        cycle_day_end INTEGER,
        cycle_start_date TEXT,
        cycle_end_date TEXT,
        weekly_repeat_days TEXT,
        repeat_interval INTEGER DEFAULT 1,
        repeat_unit TEXT DEFAULT 'week',
        calendar_start_date TEXT,
        calendar_end_date TEXT,
        calendar_ends_type TEXT DEFAULT 'never',
        max_occurrences INTEGER,
        completed_occurrences INTEGER DEFAULT 0,
        specific_dates TEXT,
        reminder_time TEXT NOT NULL,
        reminder_times TEXT,
        alarm_type TEXT DEFAULT 'notification',
        sound_enabled INTEGER DEFAULT 0,
        next_occurrence TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    getDb().execSync(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL,
        snoozed_until TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    getDb().execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  },

  getAllReminders(): LocalReminder[] {
    if (isWeb) return [...webReminders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const rows = getDb().getAllSync('SELECT * FROM reminders ORDER BY created_at DESC');
    return rows.map(rowToReminder);
  },

  getReminder(id: string): LocalReminder | null {
    if (isWeb) return webReminders.find((r) => r.id === id) ?? null;
    const row = getDb().getFirstSync('SELECT * FROM reminders WHERE id = ?', [id]);
    return row ? rowToReminder(row) : null;
  },

  createReminder(data: CreateReminderInput): LocalReminder {
    const id = generateId();
    const now = new Date().toISOString();

    const partial: Partial<LocalReminder> = {
      reminderType: data.reminderType,
      cycleDayStart: data.cycleDayStart ?? null,
      cycleDayEnd: data.cycleDayEnd ?? null,
      cycleStartDate: data.cycleStartDate ?? null,
      cycleEndDate: data.cycleEndDate ?? null,
      weeklyRepeatDays: data.weeklyRepeatDays ?? null,
      repeatInterval: data.repeatInterval ?? 1,
      repeatUnit: data.repeatUnit ?? 'week',
      calendarStartDate: data.calendarStartDate ?? null,
      calendarEndDate: data.calendarEndDate ?? null,
      calendarEndsType: data.calendarEndsType ?? 'never',
      maxOccurrences: data.maxOccurrences ?? null,
      completedOccurrences: data.completedOccurrences ?? 0,
      reminderTime: data.reminderTime,
      reminderTimes: data.reminderTimes ?? null,
    };

    const nextOccurrence = calculateNextOccurrence(partial as any)?.toISOString() ?? null;

    if (isWeb) {
      const reminder: LocalReminder = {
        id,
        title: data.title,
        notes: data.notes ?? null,
        reminderType: data.reminderType,
        cycleIntervalDays: data.cycleIntervalDays ?? null,
        cycleDayStart: data.cycleDayStart ?? null,
        cycleDayEnd: data.cycleDayEnd ?? null,
        cycleStartDate: data.cycleStartDate ?? null,
        cycleEndDate: data.cycleEndDate ?? null,
        weeklyRepeatDays: data.weeklyRepeatDays ?? null,
        repeatInterval: data.repeatInterval ?? 1,
        repeatUnit: data.repeatUnit ?? 'week',
        calendarStartDate: data.calendarStartDate ?? null,
        calendarEndDate: data.calendarEndDate ?? null,
        calendarEndsType: data.calendarEndsType ?? 'never',
        maxOccurrences: data.maxOccurrences ?? null,
        completedOccurrences: data.completedOccurrences ?? 0,
        specificDates: data.specificDates ?? null,
        reminderTime: data.reminderTime,
        reminderTimes: data.reminderTimes ?? null,
        alarmType: data.alarmType ?? 'notification',
        soundEnabled: data.soundEnabled ?? false,
        nextOccurrence,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: now,
        updatedAt: now,
      };
      webReminders.push(reminder);
      saveWebReminders();
      notifyListeners();
      return reminder;
    }

    getDb().runSync(
      `INSERT INTO reminders (
        id, title, notes, reminder_type, cycle_interval_days, cycle_day_start, cycle_day_end,
        cycle_start_date, cycle_end_date, weekly_repeat_days, repeat_interval, repeat_unit,
        calendar_start_date, calendar_end_date, calendar_ends_type, max_occurrences,
        completed_occurrences, specific_dates, reminder_time, reminder_times, alarm_type,
        sound_enabled, next_occurrence, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.notes ?? null,
        data.reminderType,
        data.cycleIntervalDays ?? null,
        data.cycleDayStart ?? null,
        data.cycleDayEnd ?? null,
        data.cycleStartDate ?? null,
        data.cycleEndDate ?? null,
        data.weeklyRepeatDays ? JSON.stringify(data.weeklyRepeatDays) : null,
        data.repeatInterval ?? 1,
        data.repeatUnit ?? 'week',
        data.calendarStartDate ?? null,
        data.calendarEndDate ?? null,
        data.calendarEndsType ?? 'never',
        data.maxOccurrences ?? null,
        data.completedOccurrences ?? 0,
        data.specificDates ? JSON.stringify(data.specificDates) : null,
        data.reminderTime,
        data.reminderTimes ? JSON.stringify(data.reminderTimes) : null,
        data.alarmType ?? 'notification',
        data.soundEnabled ? 1 : 0,
        nextOccurrence,
        data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
        now,
        now,
      ]
    );

    const result = this.getReminder(id)!;
    notifyListeners();
    return result;
  },

  updateReminder(id: string, data: Partial<CreateReminderInput>): LocalReminder | null {
    const existing = this.getReminder(id);
    if (!existing) return null;

    const merged: Partial<LocalReminder> = {
      ...existing,
      ...data,
    };

    const nextOccurrence = calculateNextOccurrence(merged as any)?.toISOString() ?? null;
    const now = new Date().toISOString();

    if (isWeb) {
      const idx = webReminders.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      const updated: LocalReminder = { ...webReminders[idx], ...data, nextOccurrence, updatedAt: now } as LocalReminder;
      webReminders[idx] = updated;
      saveWebReminders();
      notifyListeners();
      return updated;
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, { column: string; transform?: (v: any) => any }> = {
      title: { column: 'title' },
      notes: { column: 'notes' },
      reminderType: { column: 'reminder_type' },
      cycleIntervalDays: { column: 'cycle_interval_days' },
      cycleDayStart: { column: 'cycle_day_start' },
      cycleDayEnd: { column: 'cycle_day_end' },
      cycleStartDate: { column: 'cycle_start_date' },
      cycleEndDate: { column: 'cycle_end_date' },
      weeklyRepeatDays: { column: 'weekly_repeat_days', transform: (v: any) => (v ? JSON.stringify(v) : null) },
      repeatInterval: { column: 'repeat_interval' },
      repeatUnit: { column: 'repeat_unit' },
      calendarStartDate: { column: 'calendar_start_date' },
      calendarEndDate: { column: 'calendar_end_date' },
      calendarEndsType: { column: 'calendar_ends_type' },
      maxOccurrences: { column: 'max_occurrences' },
      completedOccurrences: { column: 'completed_occurrences' },
      specificDates: { column: 'specific_dates', transform: (v: any) => (v ? JSON.stringify(v) : null) },
      reminderTime: { column: 'reminder_time' },
      reminderTimes: { column: 'reminder_times', transform: (v: any) => (v ? JSON.stringify(v) : null) },
      alarmType: { column: 'alarm_type' },
      soundEnabled: { column: 'sound_enabled', transform: (v: any) => (v ? 1 : 0) },
      isActive: { column: 'is_active', transform: (v: any) => (v ? 1 : 0) },
    };

    for (const [key, mapping] of Object.entries(fieldMap)) {
      if (key in data) {
        setClauses.push(`${mapping.column} = ?`);
        const val = (data as any)[key];
        values.push(mapping.transform ? mapping.transform(val) : (val ?? null));
      }
    }

    setClauses.push('next_occurrence = ?');
    values.push(nextOccurrence);

    setClauses.push('updated_at = ?');
    values.push(now);

    values.push(id);

    getDb().runSync(`UPDATE reminders SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const result = this.getReminder(id);
    notifyListeners();
    return result;
  },

  deleteReminder(id: string): void {
    if (isWeb) {
      webReminders = webReminders.filter((r) => r.id !== id);
      saveWebReminders();
      notifyListeners();
      return;
    }
    getDb().runSync('DELETE FROM reminders WHERE id = ?', [id]);
    notifyListeners();
  },

  toggleReminderActive(id: string, isActive: boolean): LocalReminder | null {
    return this.updateReminder(id, { isActive });
  },

  addHistoryEntry(data: {
    reminderId: string;
    title: string;
    scheduledAt: string;
    status: string;
    completedAt?: string;
  }): void {
    if (isWeb) {
      const entry: LocalHistoryEntry = {
        id: generateId(),
        reminderId: data.reminderId,
        title: data.title,
        scheduledAt: data.scheduledAt,
        status: data.status,
        snoozedUntil: null,
        completedAt: data.completedAt ?? null,
        createdAt: new Date().toISOString(),
      };
      webHistory.unshift(entry);
      saveWebHistory();
      notifyListeners();
      return;
    }
    const id = generateId();
    getDb().runSync(
      `INSERT INTO notification_history (id, reminder_id, title, scheduled_at, status, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.reminderId, data.title, data.scheduledAt, data.status, data.completedAt ?? null]
    );
    notifyListeners();
  },

  getHistory(): LocalHistoryEntry[] {
    if (isWeb) return [...webHistory];
    const rows = getDb().getAllSync('SELECT * FROM notification_history ORDER BY created_at DESC');
    return rows.map(rowToHistory);
  },

  getSetting(key: string): string | null {
    if (isWeb) return webSettings[key] ?? null;
    const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  },

  setSetting(key: string, value: string): void {
    if (isWeb) {
      webSettings[key] = value;
      saveWebSettings();
      notifyListeners();
      return;
    }
    getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    notifyListeners();
  },
};
