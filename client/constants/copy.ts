/**
 * Centralized copy/strings file for the GoFlo app.
 * All user-facing text should be defined here for easy management and future i18n support.
 */

export const Copy = {
  // App-wide
  app: {
    name: "GoFlo",
  },

  // Common/Shared
  common: {
    done: "Done",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    today: "Today",
    tomorrow: "Tomorrow",
    never: "Never",
    on: "On",
    after: "After",
    active: "Active",
    week: "Week",
    day: "Day",
    days: "days",
    occurrence: "occurrence",
    to: "to",
  },

  // Navigation/Headers
  navigation: {
    today: "Today",
    reminders: "Reminders",
    more: "More",
    profile: "Profile",
    history: "History",
    newReminder: "New Reminder",
  },

  // Home Screen
  home: {
    welcomeTitle: "Welcome message",
    welcomeText: "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien is convallis",
    createReminderButton: "Create A Reminder",
    todaysReminders: "Today's Reminders",
    upcoming: "Upcoming",
    statusActive: "Status: Active",
    takeButton: "Take",
    doneButton: "Done",
    checkHistory: "Check out your History",
    checkHistoryText: (count: number) => `You have ${count} unresolved reminders, check out your history to make sure you're on track`,
    noRemindersTitle: "No reminders yet",
    noRemindersSubtitle: "Create your first reminder to get started",
    notificationBannerText: "Notifications are off - tap to enable in Settings",
    timeToday: (time: string) => `${time} today`,
    dateAtTime: (date: string, time: string) => `${date} at ${time}`,
  },

  // Type Selector Screen
  typeSelector: {
    title: "What kind of reminder?",
    subtitle: "Choose how you want this reminder to repeat",
    cycleBased: "Cycle-Based",
    cycleBasedDescription: "On specific days of a repeating cycle. Examples: days 15–28 of a 28-day cycle.",
    calendarBased: "Calendar-Based",
    calendarBasedDescription: "Examples: every 2 days, Mondays and Thursdays.",
  },

  // Create Reminder Screen (Cycle-Based)
  createCycleReminder: {
    headerTitle: "Create Cycle Reminder",
    editHeaderTitle: "Edit Reminder",
    addTitlePlaceholder: "Add reminder title",
    addNotesPlaceholder: "Add medication notes",
    addDaysOfCycle: "Add days of cycle",
    cycleStartsToday: "Cycle starts today",
    cycleStartsTomorrow: "Cycle starts tomorrow",
    cycleStartsOn: (date: string) => `Cycle starts on ${date}`,
    addCycleStartDate: "Add cycle start date",
    noEndDate: "No end date",
    endsOn: (date: string) => `Ends on ${date}`,
    addEndDate: "Add end date",
    addReminderTime: "Add reminder time",
    remindMeAt: (time: string) => `Remind me at ${time}`,
    setReminderTimeTitle: "Set reminder time",
    timeFormatHint: "Enter time in 24-hour format (e.g., 09:00)",
    deleteReminder: "Delete Reminder",
  },

  // Create Calendar Reminder Screen
  createCalendarReminder: {
    headerTitle: "Create Calendar Reminder",
    editHeaderTitle: "Edit Reminder",
    addTitlePlaceholder: "Add reminder title",
    addNotesPlaceholder: "Add medication notes",
    repeatFrequency: "Repeat frequency",
    startsOn: "Starts on",
    addReminderTime: "Add reminder time",
    remindMeAt: (time: string) => `Remind me at ${time}`,
    setReminderTimeTitle: "Set reminder time",
    timeFormatHint: "Enter time in 24-hour format (e.g., 14:30)",
    deleteReminder: "Delete Reminder",
  },

  // Sound Settings (shared between both create screens)
  soundSettings: {
    makeSomeNoise: "Make some noise",
    playsDefaultSound: "An alarm will sound until you dismiss the notification",
  },

  // Repeating Days Screen
  repeatingDays: {
    headerTitle: "Repeating days",
    cycleStarts: "Cycle starts",
    ends: "Ends",
    descriptionPlaceholder: "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sap",
  },

  // Repeat Frequency Screen
  repeatFrequency: {
    headerTitle: "Repeat frequency",
    repeatEvery: "Repeat every",
    repeatOn: "Repeat on",
    ends: "Ends",
    selectEndDate: "Select end date",
  },

  // Reminders Screen
  remindersScreen: {
    title: "Reminders",
    noRemindersTitle: "No Reminders Yet",
    noRemindersDescription: "Create your first reminder to get started with building good habits.",
    createReminderButton: "Create A Reminder",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    deleteCount: (count: number) => `Delete (${count})`,
    deleteConfirmTitle: "Delete Reminders",
    deleteConfirmMessage: (count: number) => `Are you sure you want to delete ${count} reminder${count > 1 ? "s" : ""}?`,
  },

  // Reminder Detail Screen
  reminderDetail: {
    reminderNotFound: "Reminder not found",
    notScheduled: "Not scheduled",
    customSchedule: "Custom schedule",
    cycleBasedLabel: "Cycle-Based",
    calendarBasedLabel: "Calendar-Based",
    scheduleSection: "Schedule",
    timeLabel: "Time",
    repeatLabel: "Repeat",
    nextOccurrenceLabel: "Next Occurrence",
    markAsComplete: "Mark as Complete",
    deleteReminder: "Delete Reminder",
    everyNDays: (days: number) => `Every ${days} day${days > 1 ? "s" : ""}`,
    everyDays: (daysStr: string) => `Every ${daysStr}`,
  },

  // History Screen
  history: {
    title: "History",
    noHistoryTitle: "No History Yet",
    noHistoryDescription: "Your notification history will appear here once you start receiving reminders.",
  },

  // More Screen
  more: {
    settingsSection: "Settings",
    historyTitle: "History",
    historySubtitle: "View past notifications",
    snoozeTitle: "Snooze Settings",
    snoozeSubtitle: "Configure snooze duration",
    alarmSoundsTitle: "Alarm Sounds",
    alarmSoundsSubtitle: "Choose notification sound",
    accountSection: "Account",
    freeTrialTitle: "Free Trial",
    trialRemaining: (days: number) => `${days} days remaining in your trial period`,
    profileTitle: "Profile",
    profileSubtitle: "Manage your account",
    emailTitle: "Email",
    emailNotSet: "Not set",
    signOutTitle: "Sign Out",
    aboutSection: "About",
    versionTitle: "Version",
  },

  // Profile Screen
  profile: {
    changePhoto: "Change Photo",
    personalInfoSection: "Personal Information",
    displayNameLabel: "Display Name",
    displayNamePlaceholder: "Enter your name",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    subscriptionSection: "Subscription",
    freeTrialTitle: "Free Trial",
    trialEndsMessage: "Your trial ends in 30 days. Upgrade to continue using all features.",
    viewPlans: "View Plans",
    saveChanges: "Save Changes",
  },

  // Snooze Settings Screen
  snoozeSettings: {
    title: "Default Snooze Duration",
    description: "Choose how long to snooze notifications when you tap the snooze button.",
    infoMessage: (duration: string) => `When you snooze a notification, it will remind you again after ${duration}.`,
    saveButton: "Save Settings",
    hour: "hour",
    hours: "hours",
    min: "min",
  },

  // Alarm Sounds Screen
  alarmSounds: {
    title: "Alarm Sound",
    description: "Choose the sound that will play when your reminders go off.",
    webNotice: "Sound preview is available in the Expo Go app on your device.",
    saveButton: "Save Selection",
    sounds: {
      default: "Default",
      chime: "Chime",
      bell: "Bell",
      digital: "Digital",
      gentle: "Gentle Wake",
      classic: "Classic",
      melody: "Melody",
    },
  },

  // Empty States
  emptyState: {
    noReminders: {
      title: "No Reminders Yet",
      description: "Create your first reminder to get started with building good habits.",
    },
    noHistory: {
      title: "No History Yet",
      description: "Your notification history will appear here once you start receiving reminders.",
    },
  },

  // Error Messages
  errors: {
    reminderNotFound: "Reminder not found",
    failedToCreate: "Failed to create reminder",
    failedToUpdate: "Failed to update reminder",
    failedToDelete: "Failed to delete reminder",
  },
};
