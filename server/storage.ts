import {
  users,
  reminders,
  notificationHistory,
  type User,
  type InsertUser,
  type Reminder,
  type InsertReminder,
  type NotificationHistory,
  type InsertNotificationHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Reminders
  getReminder(id: string): Promise<Reminder | undefined>;
  getRemindersByUserId(userId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<void>;

  // Notification History
  getNotificationHistory(userId: string): Promise<NotificationHistory[]>;
  createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory>;
  updateNotificationHistory(id: string, data: Partial<NotificationHistory>): Promise<NotificationHistory | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Reminders
  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder || undefined;
  }

  async getRemindersByUserId(userId: string): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.createdAt));
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    // Calculate next occurrence
    const nextOccurrence = this.calculateNextOccurrence(insertReminder);
    
    const [reminder] = await db
      .insert(reminders)
      .values({
        ...insertReminder,
        nextOccurrence,
      })
      .returning();
    return reminder;
  }

  async updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder | undefined> {
    const [reminder] = await db
      .update(reminders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning();
    return reminder || undefined;
  }

  async deleteReminder(id: string): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  // Notification History
  async getNotificationHistory(userId: string): Promise<NotificationHistory[]> {
    return db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.scheduledAt));
  }

  async createNotificationHistory(insertHistory: InsertNotificationHistory): Promise<NotificationHistory> {
    const [history] = await db.insert(notificationHistory).values(insertHistory).returning();
    return history;
  }

  async updateNotificationHistory(id: string, data: Partial<NotificationHistory>): Promise<NotificationHistory | undefined> {
    const [history] = await db
      .update(notificationHistory)
      .set(data)
      .where(eq(notificationHistory.id, id))
      .returning();
    return history || undefined;
  }

  // Helper: Calculate next occurrence based on reminder type
  private calculateNextOccurrence(reminder: InsertReminder): Date {
    const now = new Date();
    const [hours, minutes] = (reminder.reminderTime || "09:00").split(":").map(Number);
    
    if (reminder.reminderType === "cycle" && reminder.cycleIntervalDays) {
      const next = new Date();
      next.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, start from tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    }
    
    if (reminder.reminderType === "calendar" && reminder.weeklyRepeatDays) {
      const weekdays = reminder.weeklyRepeatDays as number[];
      const currentDay = now.getDay();
      
      // Find the next matching day
      for (let i = 0; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (weekdays.includes(checkDay)) {
          const next = new Date();
          next.setDate(now.getDate() + i);
          next.setHours(hours, minutes, 0, 0);
          
          if (next > now) {
            return next;
          }
        }
      }
    }
    
    // Default: next day at the specified time
    const next = new Date();
    next.setDate(now.getDate() + 1);
    next.setHours(hours, minutes, 0, 0);
    return next;
  }
}

export const storage = new DatabaseStorage();
