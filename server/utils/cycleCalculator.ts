export interface CycleReminderConfig {
  cycleDayStart: number;
  cycleDayEnd: number;
  cycleStartDate: Date;
  cycleEndDate?: Date | null;
}

export interface CycleCheckResult {
  isActiveDay: boolean;
  currentCycleDay: number;
  currentCycleNumber: number;
  daysUntilNextActive: number;
  nextActiveDate: Date | null;
}

export function checkCycleDay(config: CycleReminderConfig, checkDate: Date = new Date()): CycleCheckResult {
  const { cycleDayStart, cycleDayEnd, cycleStartDate, cycleEndDate } = config;
  const cycleLength = cycleDayEnd;
  
  const startDateOnly = new Date(cycleStartDate);
  startDateOnly.setHours(0, 0, 0, 0);
  
  const checkDateOnly = new Date(checkDate);
  checkDateOnly.setHours(0, 0, 0, 0);
  
  if (cycleEndDate) {
    const endDateOnly = new Date(cycleEndDate);
    endDateOnly.setHours(0, 0, 0, 0);
    if (checkDateOnly > endDateOnly) {
      return {
        isActiveDay: false,
        currentCycleDay: 0,
        currentCycleNumber: 0,
        daysUntilNextActive: -1,
        nextActiveDate: null,
      };
    }
  }
  
  if (checkDateOnly < startDateOnly) {
    const daysUntilStart = Math.floor((startDateOnly.getTime() - checkDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilActive = daysUntilStart + (cycleDayStart - 1);
    const nextActiveDate = new Date(startDateOnly);
    nextActiveDate.setDate(nextActiveDate.getDate() + (cycleDayStart - 1));
    
    return {
      isActiveDay: false,
      currentCycleDay: 0,
      currentCycleNumber: 0,
      daysUntilNextActive: daysUntilActive,
      nextActiveDate,
    };
  }
  
  const daysSinceStart = Math.floor((checkDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  const currentCycleNumber = Math.floor(daysSinceStart / cycleLength) + 1;
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
  
  return {
    isActiveDay,
    currentCycleDay: dayInCurrentCycle,
    currentCycleNumber,
    daysUntilNextActive,
    nextActiveDate,
  };
}

export function getNextNotificationTimes(
  config: CycleReminderConfig,
  reminderTimes: string[],
  fromDate: Date = new Date()
): Date[] {
  const cycleCheck = checkCycleDay(config, fromDate);
  
  if (!cycleCheck.isActiveDay || !cycleCheck.nextActiveDate) {
    if (cycleCheck.nextActiveDate) {
      return reminderTimes.map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const notificationDate = new Date(cycleCheck.nextActiveDate!);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      });
    }
    return [];
  }
  
  const now = new Date();
  const notifications: Date[] = [];
  
  for (const time of reminderTimes) {
    const [hours, minutes] = time.split(':').map(Number);
    const notificationDate = new Date(cycleCheck.nextActiveDate);
    notificationDate.setHours(hours, minutes, 0, 0);
    
    if (notificationDate > now) {
      notifications.push(notificationDate);
    }
  }
  
  if (notifications.length === 0) {
    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowCheck = checkCycleDay(config, tomorrow);
    
    if (tomorrowCheck.isActiveDay && tomorrowCheck.nextActiveDate) {
      return reminderTimes.map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const notificationDate = new Date(tomorrowCheck.nextActiveDate!);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      });
    }
  }
  
  return notifications;
}
