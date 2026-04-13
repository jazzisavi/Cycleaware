import {
  calculateNextCycleOccurrence,
  calculateNextIntervalOccurrence,
  calculateNextWeekdayOccurrence,
  calculateNextOccurrence,
} from '../services/reminderCalculator';

// Helpers
function makeDate(dateStr: string, timeStr: string): Date {
  const d = new Date(dateStr);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function daysBefore(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAfter(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function dateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================
// calculateNextCycleOccurrence
// ============================================================

describe('calculateNextCycleOccurrence', () => {
  it('returns null when reminderTimes is empty', () => {
    const result = calculateNextCycleOccurrence({
      cycleDayStart: 1,
      cycleDayEnd: 28,
      cycleStartDate: dateStr(daysBefore(10)),
      cycleEndDate: null,
      reminderTimes: [],
    });
    expect(result).toBeNull();
  });

  it('returns a future time on an active day when times remain today', () => {
    const from = makeDate(todayDateStr(), '07:00');
    const cycleStart = daysBefore(5);

    const result = calculateNextCycleOccurrence(
      {
        cycleDayStart: 1,
        cycleDayEnd: 28,
        cycleStartDate: dateStr(cycleStart),
        cycleEndDate: null,
        reminderTimes: ['09:00', '15:00'],
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(9);
    expect(result!.getMinutes()).toBe(0);
    expect(result! > from).toBe(true);
  });

  it('moves to next active day when all times have passed today', () => {
    // from = 22:00 today; cycle active; no times after 22:00
    const from = makeDate(todayDateStr(), '22:00');
    const cycleStart = daysBefore(5);

    const result = calculateNextCycleOccurrence(
      {
        cycleDayStart: 1,
        cycleDayEnd: 28,
        cycleStartDate: dateStr(cycleStart),
        cycleEndDate: null,
        reminderTimes: ['08:00', '12:00'],
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result! > from).toBe(true);
    // Should be tomorrow at 08:00
    const tomorrow = new Date(from);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result!.getDate()).toBe(tomorrow.getDate());
    expect(result!.getHours()).toBe(8);
  });

  it('returns null when cycle has expired (past cycleEndDate)', () => {
    const result = calculateNextCycleOccurrence({
      cycleDayStart: 1,
      cycleDayEnd: 28,
      cycleStartDate: dateStr(daysBefore(60)),
      cycleEndDate: dateStr(daysBefore(5)),
      reminderTimes: ['09:00'],
    });
    expect(result).toBeNull();
  });

  it('returns next active date when today is before cycleDayStart within cycle', () => {
    // 28-day cycle, active on days 14–28. Start 1 day ago → today is day 2 (inactive).
    const cycleStart = daysBefore(1);
    const from = makeDate(todayDateStr(), '07:00');

    const result = calculateNextCycleOccurrence(
      {
        cycleDayStart: 14,
        cycleDayEnd: 28,
        cycleStartDate: dateStr(cycleStart),
        cycleEndDate: null,
        reminderTimes: ['09:00'],
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result! > from).toBe(true);
    // Day 14 is 13 days from cycle start, which is 12 days from now
    const expected = new Date();
    expected.setDate(expected.getDate() + 12);
    expected.setHours(9, 0, 0, 0);
    expect(result!.getDate()).toBe(expected.getDate());
  });
});

// ============================================================
// calculateNextIntervalOccurrence
// ============================================================

describe('calculateNextIntervalOccurrence', () => {
  it('returns next interval date in the future', () => {
    const from = makeDate(todayDateStr(), '07:00');

    const result = calculateNextIntervalOccurrence(
      {
        repeatInterval: 7,
        calendarStartDate: dateStr(daysBefore(7)),
        calendarEndDate: null,
        calendarEndsType: 'never',
        maxOccurrences: null,
        completedOccurrences: 0,
        reminderTime: '09:00',
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result! > from).toBe(true);
    expect(result!.getHours()).toBe(9);
  });

  it('returns null when calendarEndsType=after and completedOccurrences >= max', () => {
    const result = calculateNextIntervalOccurrence({
      repeatInterval: 7,
      calendarStartDate: dateStr(daysBefore(14)),
      calendarEndDate: null,
      calendarEndsType: 'after',
      maxOccurrences: 2,
      completedOccurrences: 2,
      reminderTime: '09:00',
    });
    expect(result).toBeNull();
  });

  it('returns null when today is past calendarEndDate', () => {
    const result = calculateNextIntervalOccurrence({
      repeatInterval: 7,
      calendarStartDate: dateStr(daysBefore(30)),
      calendarEndDate: dateStr(daysBefore(5)),
      calendarEndsType: 'on',
      maxOccurrences: null,
      completedOccurrences: 0,
      reminderTime: '09:00',
    });
    expect(result).toBeNull();
  });

  it('includes a reminder at 09:00 on the end date itself (end-of-day boundary)', () => {
    // End date is 7 days from now, reminder is at 09:00 — must be included
    const endDate = daysAfter(7);
    const from = makeDate(todayDateStr(), '07:00');

    const result = calculateNextIntervalOccurrence(
      {
        repeatInterval: 7,
        calendarStartDate: dateStr(daysBefore(0)),
        calendarEndDate: dateStr(endDate),
        calendarEndsType: 'on',
        maxOccurrences: null,
        completedOccurrences: 0,
        reminderTime: '09:00',
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result!.toISOString().split('T')[0]).toBe(dateStr(endDate));
    expect(result!.getHours()).toBe(9);
  });
});

// ============================================================
// calculateNextWeekdayOccurrence
// ============================================================

describe('calculateNextWeekdayOccurrence', () => {
  it('returns the next matching weekday', () => {
    const from = new Date();
    from.setHours(7, 0, 0, 0);

    const result = calculateNextWeekdayOccurrence(
      {
        weeklyRepeatDays: ['mon', 'wed', 'fri'],
        repeatInterval: 1,
        calendarStartDate: dateStr(daysBefore(14)),
        calendarEndDate: null,
        calendarEndsType: 'never',
        maxOccurrences: null,
        completedOccurrences: 0,
        reminderTime: '09:00',
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result! > from).toBe(true);
    expect([1, 3, 5]).toContain(result!.getDay()); // mon=1, wed=3, fri=5
  });

  it('includes a reminder at 09:00 on the end date itself (end-of-day boundary)', () => {
    // Set end date to be the next Monday/Wed/Fri from today
    const from = new Date();
    from.setHours(7, 0, 0, 0);

    // Find the next Monday
    const nextMonday = new Date(from);
    const daysToMonday = (8 - from.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysToMonday);

    const result = calculateNextWeekdayOccurrence(
      {
        weeklyRepeatDays: ['mon'],
        repeatInterval: 1,
        calendarStartDate: dateStr(daysBefore(7)),
        calendarEndDate: dateStr(nextMonday),
        calendarEndsType: 'on',
        maxOccurrences: null,
        completedOccurrences: 0,
        reminderTime: '09:00',
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(1); // Monday
    expect(result!.toISOString().split('T')[0]).toBe(dateStr(nextMonday));
  });

  it('returns null when past calendarEndDate', () => {
    const result = calculateNextWeekdayOccurrence({
      weeklyRepeatDays: ['mon', 'wed', 'fri'],
      repeatInterval: 1,
      calendarStartDate: dateStr(daysBefore(30)),
      calendarEndDate: dateStr(daysBefore(3)),
      calendarEndsType: 'on',
      maxOccurrences: null,
      completedOccurrences: 0,
      reminderTime: '09:00',
    });
    expect(result).toBeNull();
  });

  it('falls back to next day when weeklyRepeatDays is empty', () => {
    const from = makeDate(todayDateStr(), '22:00');

    const result = calculateNextWeekdayOccurrence(
      {
        weeklyRepeatDays: [],
        repeatInterval: 1,
        calendarStartDate: dateStr(daysBefore(0)),
        calendarEndDate: null,
        calendarEndsType: 'never',
        maxOccurrences: null,
        completedOccurrences: 0,
        reminderTime: '09:00',
      },
      from
    );

    expect(result).not.toBeNull();
    expect(result! > from).toBe(true);
  });
});

// ============================================================
// calculateNextOccurrence dispatcher
// ============================================================

describe('calculateNextOccurrence dispatcher', () => {
  it('returns null when reminderType is undefined', () => {
    const result = calculateNextOccurrence({} as any);
    expect(result).toBeNull();
  });

  it('routes cycle type correctly', () => {
    const result = calculateNextOccurrence({
      reminderType: 'cycle',
      cycleDayStart: 1,
      cycleDayEnd: 28,
      cycleStartDate: dateStr(daysBefore(5)),
      cycleEndDate: null,
      reminderTimes: ['09:00'],
    });
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Date);
  });

  it('routes calendar/day type correctly', () => {
    const result = calculateNextOccurrence({
      reminderType: 'calendar',
      repeatUnit: 'day',
      repeatInterval: 3,
      calendarStartDate: dateStr(daysBefore(3)),
      reminderTime: '09:00',
    });
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Date);
  });

  it('routes calendar/week type correctly', () => {
    const result = calculateNextOccurrence({
      reminderType: 'calendar',
      repeatUnit: 'week',
      repeatInterval: 1,
      weeklyRepeatDays: ['mon', 'thu'],
      calendarStartDate: dateStr(daysBefore(7)),
      reminderTime: '09:00',
    });
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Date);
  });

  it('returns null for cycle when required fields are missing', () => {
    const result = calculateNextOccurrence({
      reminderType: 'cycle',
    });
    expect(result).toBeNull();
  });
});
