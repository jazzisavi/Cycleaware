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
  cycleIntervalDays: integer("cycle_interval_days"),
  
  // For calendar-based reminders (weekly repeat)
  weeklyRepeatDays: jsonb("weekly_repeat_days").$type<number[]>(), // 0-6 for Sun-Sat
  
  // For calendar-based reminders (specific dates)
  specificDates: jsonb("specific_dates").$type<string[]>(), // ISO date strings
  
  // Time settings
  reminderTime: text("reminder_time").notNull(), // HH:MM format
  
  // Next occurrence
  nextOccurrence: timestamp("next_occurrence"),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
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
