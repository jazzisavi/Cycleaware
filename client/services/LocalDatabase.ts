import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('goflo.db');

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

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function checkCycleDay(
  cycleDayStart: number,
  cycleDayEnd: number,
  cycleStartDate: Date,
  cycleEndDate: Date | null,
  checkDate: Date = new Date()
): {
  isActiveDay: boolean;
  currentCycleDay: number;
  daysUntilNextActive: number;
  nextActiveDate: Date | null;
} {
  const cycleLength = cycleDayEnd;

  const startDateOnly = new Date(cycleStartDate);
  startDateOnly.setHours(0, 0, 0, 0);

  const checkDateOnly = new Date(checkDate);
  checkDateOnly.setHours(0, 0, 0, 0);

  if (cycleEndDate) {
    const endDateOnly = new Date(cycleEndDate);
    endDateOnly.setHours(0, 0, 0, 0);
    if (checkDateOnly > endDateOnly) {
      return { isActiveDay: false, currentCycleDay: 0, daysUntilNextActive: -1, nextActiveDate: null };
    }
  }

  if (checkDateOnly < startDateOnly) {
    const daysUntilStart = Math.floor((startDateOnly.getTime() - checkDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilActive = daysUntilStart + (cycleDayStart - 1);
    const nextActiveDate = new Date(startDateOnly);
    nextActiveDate.setDate(nextActiveDate.getDate() + (cycleDayStart - 1));
    return { isActiveDay: false, currentCycleDay: 0, daysUntilNextActive: daysUntilActive, nextActiveDate };
  }

  const daysSinceStart = Math.floor((checkDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  const dayInCurrentCycle = (daysSinceStart % cycleLength) + 1;
  const isActiveDay = dayInCurrentCycle >= cycleDayStart && dayInCurrentCycle <= cycleDayEnd;

  let daysUntilNextActive: number;
  let nextActiveDate: Date | null;

  if (isActiveDay) {
    daysUntilNextActive = 0;
    nextActiveDate = new Date(checkDateOnly);
  } else if (dayInCurrentCycle < cycleDayStart) {
    daysUntilNextActive = cycleDayStart - dayInCurrentCycle;
    nextActiveDate = new Date(checkDateOnly);
    nextActiveDate.setDate(nextActiveDate.getDate() + daysUntilNextActive);
  } else {
    const daysLeftInCycle = cycleLength - dayInCurrentCycle;
    daysUntilNextActive = daysLeftInCycle + cycleDayStart;
    nextActiveDate = new Date(checkDateOnly);
    nextActiveDate.setDate(nextActiveDate.getDate() + daysUntilNextActive);
  }

  if (cycleEndDate && nextActiveDate) {
    const endDateOnly = new Date(cycleEndDate);
    endDateOnly.setHours(0, 0, 0, 0);
    if (nextActiveDate > endDateOnly) {
      nextActiveDate = null;
      daysUntilNextActive = -1;
    }
  }

  return { isActiveDay, currentCycleDay: dayInCurrentCycle, daysUntilNextActive, nextActiveDate };
}

function calculateNextCycleOccurrence(reminder: Partial<LocalReminder>): string | null {
  const { cycleDayStart, cycleDayEnd, cycleStartDate, cycleEndDate, reminderTime, reminderTimes } = reminder;
  if (!cycleDayStart || !cycleDayEnd || !cycleStartDate) return null;

  const times = reminderTimes || (reminderTime ? [reminderTime] : []);
  if (times.length === 0) return null;

  const fromDate = new Date();
  const cycleCheck = checkCycleDay(
    cycleDayStart,
    cycleDayEnd,
    new Date(cycleStartDate),
    cycleEndDate ? new Date(cycleEndDate) : null,
    fromDate
  );

  if (!cycleCheck.nextActiveDate) return null;

  if (!cycleCheck.isActiveDay) {
    const earliest = times
      .map((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const d = new Date(cycleCheck.nextActiveDate!);
        d.setHours(hours, minutes, 0, 0);
        return d;
      })
      .reduce((a, b) => (a < b ? a : b));
    return earliest.toISOString();
  }

  const now = new Date();
  const futureToday = times
    .map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const d = new Date(cycleCheck.nextActiveDate!);
      d.setHours(hours, minutes, 0, 0);
      return d;
    })
    .filter((d) => d > now);

  if (futureToday.length > 0) {
    return futureToday.reduce((a, b) => (a < b ? a : b)).toISOString();
  }

  const tomorrow = new Date(fromDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowCheck = checkCycleDay(
    cycleDayStart,
    cycleDayEnd,
    new Date(cycleStartDate),
    cycleEndDate ? new Date(cycleEndDate) : null,
    tomorrow
  );

  if (tomorrowCheck.isActiveDay && tomorrowCheck.nextActiveDate) {
    const earliest = times
      .map((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const d = new Date(tomorrowCheck.nextActiveDate!);
        d.setHours(hours, minutes, 0, 0);
        return d;
      })
      .reduce((a, b) => (a < b ? a : b));
    return earliest.toISOString();
  }

  if (tomorrowCheck.nextActiveDate) {
    const earliest = times
      .map((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const d = new Date(tomorrowCheck.nextActiveDate!);
        d.setHours(hours, minutes, 0, 0);
        return d;
      })
      .reduce((a, b) => (a < b ? a : b));
    return earliest.toISOString();
  }

  return null;
}

function calculateNextCalendarOccurrence(reminderData: Partial<LocalReminder>): string | null {
  const {
    weeklyRepeatDays,
    repeatInterval = 1,
    repeatUnit = 'week',
    calendarStartDate,
    calendarEndDate,
    calendarEndsType = 'never',
    maxOccurrences,
    completedOccurrences = 0,
    reminderTime = '09:00',
  } = reminderData;

  const fromDate = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const startDate = calendarStartDate ? new Date(calendarStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  if (calendarEndsType === 'on' && calendarEndDate) {
    const endDate = new Date(calendarEndDate);
    endDate.setHours(23, 59, 59, 999);
    if (fromDate > endDate) return null;
  }

  if (calendarEndsType === 'after' && maxOccurrences) {
    if (completedOccurrences >= maxOccurrences) return null;
  }

  let searchDate = new Date(Math.max(startDate.getTime(), fromDate.getTime()));
  searchDate.setHours(0, 0, 0, 0);

  if (repeatUnit === 'day') {
    const daysSinceStart = Math.floor((searchDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysIntoInterval = daysSinceStart % repeatInterval;

    if (daysIntoInterval !== 0) {
      searchDate.setDate(searchDate.getDate() + (repeatInterval - daysIntoInterval));
    }

    const todayWithTime = new Date(searchDate);
    todayWithTime.setHours(hours, minutes, 0, 0);

    if (todayWithTime > fromDate) {
      return todayWithTime.toISOString();
    }

    searchDate.setDate(searchDate.getDate() + repeatInterval);
    searchDate.setHours(hours, minutes, 0, 0);
    return searchDate.toISOString();
  } else {
    const selectedDays = (weeklyRepeatDays || []) as string[];

    if (selectedDays.length === 0) {
      const result = new Date(searchDate);
      result.setHours(hours, minutes, 0, 0);
      if (result > fromDate) return result.toISOString();
      result.setDate(result.getDate() + 1);
      return result.toISOString();
    }

    const dayNumbers = selectedDays.map((d) => DAY_NAME_TO_NUMBER[d]).filter((n) => n !== undefined);

    for (let weekOffset = 0; weekOffset < 8 * repeatInterval; weekOffset++) {
      const checkDate = new Date(searchDate);
      checkDate.setDate(checkDate.getDate() + weekOffset);

      const daysSinceStart = Math.floor((checkDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);

      if (weeksSinceStart % repeatInterval !== 0) {
        continue;
      }

      const dayOfWeek = checkDate.getDay();
      if (dayNumbers.includes(dayOfWeek)) {
        const resultDate = new Date(checkDate);
        resultDate.setHours(hours, minutes, 0, 0);

        if (resultDate > fromDate) {
          if (calendarEndsType === 'on' && calendarEndDate) {
            const endDate = new Date(calendarEndDate);
            if (resultDate > endDate) return null;
          }
          return resultDate.toISOString();
        }
      }
    }

    return null;
  }
}

function calculateNextOccurrence(reminder: Partial<LocalReminder>): string | null {
  if (reminder.reminderType === 'cycle') {
    return calculateNextCycleOccurrence(reminder);
  } else if (reminder.reminderType === 'calendar') {
    return calculateNextCalendarOccurrence(reminder);
  }
  return null;
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
  initDatabase(): void {
    db.execSync(`
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

    db.execSync(`
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

    db.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  },

  getAllReminders(): LocalReminder[] {
    const rows = db.getAllSync('SELECT * FROM reminders ORDER BY created_at DESC');
    return rows.map(rowToReminder);
  },

  getReminder(id: string): LocalReminder | null {
    const row = db.getFirstSync('SELECT * FROM reminders WHERE id = ?', [id]);
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

    const nextOccurrence = calculateNextOccurrence(partial);

    db.runSync(
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

    return this.getReminder(id)!;
  },

  updateReminder(id: string, data: Partial<CreateReminderInput>): LocalReminder | null {
    const existing = this.getReminder(id);
    if (!existing) return null;

    const merged: Partial<LocalReminder> = {
      ...existing,
      ...data,
    };

    const nextOccurrence = calculateNextOccurrence(merged);
    const now = new Date().toISOString();

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

    db.runSync(`UPDATE reminders SET ${setClauses.join(', ')} WHERE id = ?`, values);

    return this.getReminder(id);
  },

  deleteReminder(id: string): void {
    db.runSync('DELETE FROM reminders WHERE id = ?', [id]);
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
    const id = generateId();
    db.runSync(
      `INSERT INTO notification_history (id, reminder_id, title, scheduled_at, status, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.reminderId, data.title, data.scheduledAt, data.status, data.completedAt ?? null]
    );
  },

  getHistory(): LocalHistoryEntry[] {
    const rows = db.getAllSync('SELECT * FROM notification_history ORDER BY created_at DESC');
    return rows.map(rowToHistory);
  },

  getSetting(key: string): string | null {
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  },

  setSetting(key: string, value: string): void {
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  },
};
