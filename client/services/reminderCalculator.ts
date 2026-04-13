/**
 * Pure next-occurrence calculation module.
 *
 * All functions are side-effect-free: plain TypeScript, no React Native
 * imports, no database calls, no notification calls. Input a reminder rule,
 * get back the next Date (or null if the reminder has expired / no next date).
 *
 * This is the reference implementation for the JS layer and the behavioural
 * spec that the native engine (Kotlin / Swift) mirrors.
 */

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CycleRule {
  cycleDayStart: number;
  cycleDayEnd: number;
  cycleStartDate: string;    // ISO date string — when the cycle epoch began
  cycleEndDate: string | null; // ISO date string — optional hard stop
  reminderTimes: string[];   // HH:MM strings, at least one required
}

export interface IntervalRule {
  repeatInterval: number;          // Every N days
  calendarStartDate: string | null;
  calendarEndDate: string | null;
  calendarEndsType: string;        // 'never' | 'on' | 'after'
  maxOccurrences: number | null;
  completedOccurrences: number;
  reminderTime: string;            // HH:MM
}

export interface WeekdayRule {
  weeklyRepeatDays: string[];      // ["mon", "wed", "fri"] etc.
  repeatInterval: number;          // Every N weeks
  calendarStartDate: string | null;
  calendarEndDate: string | null;
  calendarEndsType: string;
  maxOccurrences: number | null;
  completedOccurrences: number;
  reminderTime: string;            // HH:MM
}

/**
 * Dispatcher input — mirrors the relevant fields of LocalReminder.
 * Accepts Partial<LocalReminder> directly (field names are identical).
 */
export interface ReminderRule {
  reminderType: 'cycle' | 'calendar';
  cycleDayStart?: number | null;
  cycleDayEnd?: number | null;
  cycleStartDate?: string | null;
  cycleEndDate?: string | null;
  weeklyRepeatDays?: string[] | null;
  repeatInterval?: number;
  repeatUnit?: string;   // 'week' | 'day'
  calendarStartDate?: string | null;
  calendarEndDate?: string | null;
  calendarEndsType?: string;
  maxOccurrences?: number | null;
  completedOccurrences?: number;
  reminderTime?: string;
  reminderTimes?: string[] | null;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

interface CycleCheckResult {
  isActiveDay: boolean;
  currentCycleDay: number;
  daysUntilNextActive: number;
  nextActiveDate: Date | null;
}

function checkCycleDay(
  cycleDayStart: number,
  cycleDayEnd: number,
  cycleStartDate: Date,
  cycleEndDate: Date | null,
  checkDate: Date = new Date()
): CycleCheckResult {
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
    const daysUntilStart = Math.floor(
      (startDateOnly.getTime() - checkDateOnly.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysUntilActive = daysUntilStart + (cycleDayStart - 1);
    const nextActiveDate = new Date(startDateOnly);
    nextActiveDate.setDate(nextActiveDate.getDate() + (cycleDayStart - 1));
    return { isActiveDay: false, currentCycleDay: 0, daysUntilNextActive: daysUntilActive, nextActiveDate };
  }

  const daysSinceStart = Math.floor(
    (checkDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24)
  );
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

// ---------------------------------------------------------------------------
// Exported pure functions
// ---------------------------------------------------------------------------

/**
 * Next occurrence for a cycle-based reminder.
 *
 * A cycle reminder fires on every day between cycleDayStart and cycleDayEnd
 * within a repeating cycle of cycleDayEnd total days, anchored to
 * cycleStartDate. Multiple reminder times per day are supported.
 */
export function calculateNextCycleOccurrence(rule: CycleRule, from: Date = new Date()): Date | null {
  const { cycleDayStart, cycleDayEnd, cycleStartDate, cycleEndDate, reminderTimes } = rule;
  if (reminderTimes.length === 0) return null;

  const cycleCheck = checkCycleDay(
    cycleDayStart,
    cycleDayEnd,
    new Date(cycleStartDate),
    cycleEndDate ? new Date(cycleEndDate) : null,
    from
  );

  if (!cycleCheck.nextActiveDate) return null;

  if (!cycleCheck.isActiveDay) {
    // Not today — earliest time on the next active day
    return reminderTimes
      .map((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const d = new Date(cycleCheck.nextActiveDate!);
        d.setHours(hours, minutes, 0, 0);
        return d;
      })
      .reduce((a, b) => (a < b ? a : b));
  }

  // Today is an active day — earliest future time today
  const futureToday = reminderTimes
    .map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const d = new Date(cycleCheck.nextActiveDate!);
      d.setHours(hours, minutes, 0, 0);
      return d;
    })
    .filter((d) => d > from);

  if (futureToday.length > 0) {
    return futureToday.reduce((a, b) => (a < b ? a : b));
  }

  // All times today have passed — look at tomorrow
  const tomorrow = new Date(from);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowCheck = checkCycleDay(
    cycleDayStart,
    cycleDayEnd,
    new Date(cycleStartDate),
    cycleEndDate ? new Date(cycleEndDate) : null,
    tomorrow
  );

  if (!tomorrowCheck.nextActiveDate) return null;

  return reminderTimes
    .map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const d = new Date(tomorrowCheck.nextActiveDate!);
      d.setHours(hours, minutes, 0, 0);
      return d;
    })
    .reduce((a, b) => (a < b ? a : b));
}

/**
 * Next occurrence for a fixed-interval (day-based) calendar reminder.
 *
 * Fires every N days starting from calendarStartDate, at the given
 * reminderTime.
 */
export function calculateNextIntervalOccurrence(rule: IntervalRule, from: Date = new Date()): Date | null {
  const {
    repeatInterval,
    calendarStartDate,
    calendarEndDate,
    calendarEndsType,
    maxOccurrences,
    completedOccurrences,
    reminderTime,
  } = rule;

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const startDate = calendarStartDate ? new Date(calendarStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  if (calendarEndsType === 'on' && calendarEndDate) {
    const endDate = new Date(calendarEndDate);
    endDate.setHours(23, 59, 59, 999);
    if (from > endDate) return null;
  }

  if (calendarEndsType === 'after' && maxOccurrences !== null && maxOccurrences !== undefined) {
    if (completedOccurrences >= maxOccurrences) return null;
  }

  let searchDate = new Date(Math.max(startDate.getTime(), from.getTime()));
  searchDate.setHours(0, 0, 0, 0);

  const daysSinceStart = Math.floor(
    (searchDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  const daysIntoInterval = daysSinceStart % repeatInterval;

  if (daysIntoInterval !== 0) {
    searchDate.setDate(searchDate.getDate() + (repeatInterval - daysIntoInterval));
  }

  const candidate = new Date(searchDate);
  candidate.setHours(hours, minutes, 0, 0);

  if (candidate > from) {
    if (calendarEndsType === 'on' && calendarEndDate && candidate > new Date(calendarEndDate)) {
      return null;
    }
    return candidate;
  }

  searchDate.setDate(searchDate.getDate() + repeatInterval);
  searchDate.setHours(hours, minutes, 0, 0);

  if (calendarEndsType === 'on' && calendarEndDate && searchDate > new Date(calendarEndDate)) {
    return null;
  }

  return searchDate;
}

/**
 * Next occurrence for a weekday-based (weekly repeat) calendar reminder.
 *
 * Fires on specified days of the week, every N weeks, starting from
 * calendarStartDate.
 */
export function calculateNextWeekdayOccurrence(rule: WeekdayRule, from: Date = new Date()): Date | null {
  const {
    weeklyRepeatDays,
    repeatInterval,
    calendarStartDate,
    calendarEndDate,
    calendarEndsType,
    maxOccurrences,
    completedOccurrences,
    reminderTime,
  } = rule;

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const startDate = calendarStartDate ? new Date(calendarStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  if (calendarEndsType === 'on' && calendarEndDate) {
    const endDate = new Date(calendarEndDate);
    endDate.setHours(23, 59, 59, 999);
    if (from > endDate) return null;
  }

  if (calendarEndsType === 'after' && maxOccurrences !== null && maxOccurrences !== undefined) {
    if (completedOccurrences >= maxOccurrences) return null;
  }

  if (weeklyRepeatDays.length === 0) {
    // No specific days — fall back to daily from startDate
    const searchDate = new Date(Math.max(startDate.getTime(), from.getTime()));
    searchDate.setHours(0, 0, 0, 0);
    const result = new Date(searchDate);
    result.setHours(hours, minutes, 0, 0);
    if (result > from) return result;
    result.setDate(result.getDate() + 1);
    return result;
  }

  const dayNumbers = weeklyRepeatDays
    .map((d) => DAY_NAME_TO_NUMBER[d])
    .filter((n) => n !== undefined);

  const searchDate = new Date(Math.max(startDate.getTime(), from.getTime()));
  searchDate.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 8 * repeatInterval; offset++) {
    const checkDate = new Date(searchDate);
    checkDate.setDate(checkDate.getDate() + offset);

    const daysSinceStart = Math.floor(
      (checkDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weeksSinceStart = Math.floor(daysSinceStart / 7);

    if (weeksSinceStart % repeatInterval !== 0) continue;

    const dayOfWeek = checkDate.getDay();
    if (!dayNumbers.includes(dayOfWeek)) continue;

    const result = new Date(checkDate);
    result.setHours(hours, minutes, 0, 0);

    if (result > from) {
      if (calendarEndsType === 'on' && calendarEndDate && result > new Date(calendarEndDate)) {
        return null;
      }
      return result;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Calculate the next occurrence for any reminder rule.
 *
 * Accepts a ReminderRule (compatible with Partial<LocalReminder>).
 * Returns the next Date, or null if there is no upcoming occurrence.
 */
export function calculateNextOccurrence(rule: ReminderRule, from: Date = new Date()): Date | null {
  if (rule.reminderType === 'cycle') {
    const { cycleDayStart, cycleDayEnd, cycleStartDate, cycleEndDate, reminderTimes, reminderTime } = rule;
    if (!cycleDayStart || !cycleDayEnd || !cycleStartDate) return null;
    const times = reminderTimes ?? (reminderTime ? [reminderTime] : []);
    if (times.length === 0) return null;
    return calculateNextCycleOccurrence(
      { cycleDayStart, cycleDayEnd, cycleStartDate, cycleEndDate: cycleEndDate ?? null, reminderTimes: times },
      from
    );
  }

  if (rule.reminderType === 'calendar') {
    const repeatUnit = rule.repeatUnit ?? 'week';
    const reminderTime = rule.reminderTime ?? '09:00';
    const base = {
      repeatInterval: rule.repeatInterval ?? 1,
      calendarStartDate: rule.calendarStartDate ?? null,
      calendarEndDate: rule.calendarEndDate ?? null,
      calendarEndsType: rule.calendarEndsType ?? 'never',
      maxOccurrences: rule.maxOccurrences ?? null,
      completedOccurrences: rule.completedOccurrences ?? 0,
      reminderTime,
    };

    if (repeatUnit === 'day') {
      return calculateNextIntervalOccurrence(base, from);
    } else {
      return calculateNextWeekdayOccurrence(
        { ...base, weeklyRepeatDays: rule.weeklyRepeatDays ?? [] },
        from
      );
    }
  }

  return null;
}
