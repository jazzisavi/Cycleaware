import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  subscriptionStatus: text("subscription_status").default("trial").notNull(), // trial, active, expired
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  subscriptionType: text("subscription_type"), // one_time, yearly
  snoozeDuration: integer("snooze_duration").default(10).notNull(), // in minutes
  selectedAlarmSound: text("selected_alarm_sound").default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  reminderType: text("reminder_type").notNull(), // cycle or calendar
  
  // For cycle-based reminders
  cycleIntervalDays: integer("cycle_interval_days"), // Total cycle length (e.g., 28 or 35)
  cycleDayStart: integer("cycle_day_start"), // Day to start reminders (e.g., 14)
  cycleDayEnd: integer("cycle_day_end"), // Day to end reminders (e.g., 28)
  cycleStartDate: timestamp("cycle_start_date"), // When the cycle begins
  cycleEndDate: timestamp("cycle_end_date"), // Optional: when to stop the cycle entirely
  
  // For calendar-based reminders (weekly repeat)
  weeklyRepeatDays: jsonb("weekly_repeat_days").$type<string[]>(), // ["mon", "tue", "wed", etc.]
  repeatInterval: integer("repeat_interval").default(1), // e.g., every 2 weeks
  repeatUnit: text("repeat_unit").default("week"), // "week" or "day"
  calendarStartDate: timestamp("calendar_start_date"), // When the calendar reminder starts
  calendarEndDate: timestamp("calendar_end_date"), // Optional end date
  calendarEndsType: text("calendar_ends_type").default("never"), // "never", "on", or "after"
  maxOccurrences: integer("max_occurrences"), // For "after X occurrences"
  completedOccurrences: integer("completed_occurrences").default(0), // Track completed count
  
  // For calendar-based reminders (specific dates)
  specificDates: jsonb("specific_dates").$type<string[]>(), // ISO date strings
  
  // Time settings - supports multiple times per day
  reminderTime: text("reminder_time").notNull(), // Primary time HH:MM format
  reminderTimes: jsonb("reminder_times").$type<string[]>(), // Additional times ["HH:MM", "HH:MM"]
  
  // Sound settings
  alarmType: text("alarm_type").default("notification"), // deprecated - kept for compatibility
  soundEnabled: boolean("sound_enabled").default(true).notNull(), // whether to play sound with notification
  
  // Next occurrence
  nextOccurrence: timestamp("next_occurrence"),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Push tokens for Expo push notifications
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  platform: text("platform"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Server-side cycle reminder configs for push notification scheduling
export const cycleReminderConfigs = pgTable("cycle_reminder_configs", {
  id: varchar("id").primaryKey(),
  pushTokenId: varchar("push_token_id").notNull().references(() => pushTokens.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  cycleDayStart: integer("cycle_day_start").notNull(),
  cycleDayEnd: integer("cycle_day_end").notNull(),
  cycleStartDate: text("cycle_start_date").notNull(),
  cycleEndDate: text("cycle_end_date"),
  reminderTimes: jsonb("reminder_times").$type<string[]>().notNull(),
  soundEnabled: boolean("sound_enabled").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSentAt: text("last_sent_at"),
  lastSentDate: text("last_sent_date"),
  lastRepromptAt: text("last_reprompt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notification history
export const notificationHistory = pgTable("notification_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reminderId: varchar("reminder_id").notNull().references(() => reminders.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull(), // completed, snoozed, missed
  snoozedUntil: timestamp("snoozed_until"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reminders: many(reminders),
  notificationHistory: many(notificationHistory),
}));

export const remindersRelations = relations(reminders, ({ one, many }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  notificationHistory: many(notificationHistory),
}));

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  reminder: one(reminders, {
    fields: [notificationHistory.reminderId],
    references: [reminders.id],
  }),
  user: one(users, {
    fields: [notificationHistory.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  displayName: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;
export type CycleReminderConfig = typeof cycleReminderConfigs.$inferSelect;
