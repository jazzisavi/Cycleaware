import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertReminderSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { checkCycleDay, getNextNotificationTimes } from "./utils/cycleCalculator";

// Simple session store (in production, use Redis or database sessions)
const sessions = new Map<string, string>();

// Day name to number mapping (0 = Sunday)
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// Calculate next occurrence for calendar-based reminders
function calculateNextCalendarOccurrence(reminderData: any, fromDate: Date = new Date()): Date | null {
  const {
    weeklyRepeatDays,
    repeatInterval = 1,
    repeatUnit = "week",
    calendarStartDate,
    calendarEndDate,
    calendarEndsType,
    maxOccurrences,
    completedOccurrences = 0,
    reminderTime = "09:00",
  } = reminderData;

  const [hours, minutes] = reminderTime.split(":").map(Number);
  const startDate = calendarStartDate ? new Date(calendarStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  // Check if reminder has ended
  if (calendarEndsType === "on" && calendarEndDate) {
    const endDate = new Date(calendarEndDate);
    endDate.setHours(23, 59, 59, 999);
    if (fromDate > endDate) {
      return null;
    }
  }

  if (calendarEndsType === "after" && maxOccurrences) {
    if (completedOccurrences >= maxOccurrences) {
      return null;
    }
  }

  // Start searching from the later of startDate or fromDate
  let searchDate = new Date(Math.max(startDate.getTime(), fromDate.getTime()));
  searchDate.setHours(0, 0, 0, 0);

  if (repeatUnit === "day") {
    // Daily repeat: find next occurrence based on interval
    const daysSinceStart = Math.floor((searchDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysIntoInterval = daysSinceStart % repeatInterval;
    
    if (daysIntoInterval !== 0) {
      // Move to next interval day
      searchDate.setDate(searchDate.getDate() + (repeatInterval - daysIntoInterval));
    }

    // Check if today's reminder time hasn't passed
    const todayWithTime = new Date(searchDate);
    todayWithTime.setHours(hours, minutes, 0, 0);
    
    if (todayWithTime > fromDate) {
      return todayWithTime;
    }
    
    // Otherwise, return next interval day
    searchDate.setDate(searchDate.getDate() + repeatInterval);
    searchDate.setHours(hours, minutes, 0, 0);
    return searchDate;
  } else {
    // Weekly repeat
    const selectedDays = (weeklyRepeatDays || []) as string[];
    
    if (selectedDays.length === 0) {
      // No days selected, default to daily
      const result = new Date(searchDate);
      result.setHours(hours, minutes, 0, 0);
      if (result > fromDate) return result;
      result.setDate(result.getDate() + 1);
      return result;
    }

    const dayNumbers = selectedDays.map(d => DAY_NAME_TO_NUMBER[d]).filter(n => n !== undefined);
    
    // Search up to 8 weeks ahead
    for (let weekOffset = 0; weekOffset < 8 * repeatInterval; weekOffset++) {
      const checkDate = new Date(searchDate);
      checkDate.setDate(checkDate.getDate() + weekOffset);
      
      // Calculate which week we're in relative to start
      const daysSinceStart = Math.floor((checkDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      
      // Check if this week matches the interval
      if (weeksSinceStart % repeatInterval !== 0) {
        continue;
      }

      const dayOfWeek = checkDate.getDay();
      if (dayNumbers.includes(dayOfWeek)) {
        const resultDate = new Date(checkDate);
        resultDate.setHours(hours, minutes, 0, 0);
        
        if (resultDate > fromDate) {
          // Check end date constraint
          if (calendarEndsType === "on" && calendarEndDate) {
            const endDate = new Date(calendarEndDate);
            if (resultDate > endDate) return null;
          }
          return resultDate;
        }
      }
    }
    
    return null;
  }
}

// Middleware to get current user from session
async function getCurrentUser(req: Request) {
  const sessionId = req.headers["x-session-id"] as string;
  if (!sessionId) return null;
  
  const userId = sessions.get(sessionId);
  if (!userId) return null;
  
  return storage.getUser(userId);
}

// For demo purposes, create a default user if none exists
async function getOrCreateDemoUser() {
  const demoEmail = "demo@goflo.app";
  let user = await storage.getUserByEmail(demoEmail);
  
  if (!user) {
    const hashedPassword = await bcrypt.hash("demo123", 10);
    user = await storage.createUser({
      email: demoEmail,
      password: hashedPassword,
      displayName: "Demo User",
    });
  }
  
  return user;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        displayName,
      });
      
      const sessionId = uuidv4();
      sessions.set(sessionId, user.id);
      
      res.json({
        user: { id: user.id, email: user.email, displayName: user.displayName },
        sessionId,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const sessionId = uuidv4();
      sessions.set(sessionId, user.id);
      
      res.json({
        user: { id: user.id, email: user.email, displayName: user.displayName },
        sessionId,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionStatus: user.subscriptionStatus,
        snoozeDuration: user.snoozeDuration,
        selectedAlarmSound: user.selectedAlarmSound,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Reminders routes
  app.get("/api/reminders", async (req: Request, res: Response) => {
    try {
      // For demo, use demo user
      const user = await getOrCreateDemoUser();
      const remindersList = await storage.getRemindersByUserId(user.id);
      res.json(remindersList);
    } catch (error) {
      console.error("Get reminders error:", error);
      res.status(500).json({ message: "Failed to get reminders" });
    }
  });

  app.get("/api/reminders/:id", async (req: Request, res: Response) => {
    try {
      const reminder = await storage.getReminder(req.params.id);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Get reminder error:", error);
      res.status(500).json({ message: "Failed to get reminder" });
    }
  });

  app.post("/api/reminders", async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateDemoUser();
      
      let nextOccurrence: Date | null = null;
      
      if (req.body.reminderType === "cycle" && req.body.cycleDayStart && req.body.cycleDayEnd && req.body.cycleStartDate) {
        const cycleConfig = {
          cycleDayStart: req.body.cycleDayStart,
          cycleDayEnd: req.body.cycleDayEnd,
          cycleStartDate: new Date(req.body.cycleStartDate),
          cycleEndDate: req.body.cycleEndDate ? new Date(req.body.cycleEndDate) : null,
        };
        
        const reminderTimes = req.body.reminderTimes || [req.body.reminderTime];
        const nextTimes = getNextNotificationTimes(cycleConfig, reminderTimes);
        
        if (nextTimes.length > 0) {
          nextOccurrence = nextTimes.reduce((earliest, current) => 
            current < earliest ? current : earliest
          );
        }
      } else if (req.body.reminderType === "calendar") {
        nextOccurrence = calculateNextCalendarOccurrence(req.body);
      }
      
      const reminderData = {
        ...req.body,
        userId: user.id,
        nextOccurrence,
        cycleStartDate: req.body.cycleStartDate ? new Date(req.body.cycleStartDate) : null,
        cycleEndDate: req.body.cycleEndDate ? new Date(req.body.cycleEndDate) : null,
        calendarStartDate: req.body.calendarStartDate ? new Date(req.body.calendarStartDate) : null,
        calendarEndDate: req.body.calendarEndDate ? new Date(req.body.calendarEndDate) : null,
      };
      
      const reminder = await storage.createReminder(reminderData);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Create reminder error:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.put("/api/reminders/:id", async (req: Request, res: Response) => {
    try {
      const reminder = await storage.updateReminder(req.params.id, req.body);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Update reminder error:", error);
      res.status(500).json({ message: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteReminder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete reminder error:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  app.post("/api/reminders/:id/complete", async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateDemoUser();
      const reminder = await storage.getReminder(req.params.id);
      
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      await storage.createNotificationHistory({
        reminderId: reminder.id,
        userId: user.id,
        title: reminder.title,
        scheduledAt: reminder.nextOccurrence || new Date(),
        status: "completed",
        completedAt: new Date(),
      });
      
      let nextOccurrence: Date | null = null;
      
      if (reminder.reminderType === "cycle" && reminder.cycleDayStart && reminder.cycleDayEnd && reminder.cycleStartDate) {
        const cycleConfig = {
          cycleDayStart: reminder.cycleDayStart,
          cycleDayEnd: reminder.cycleDayEnd,
          cycleStartDate: new Date(reminder.cycleStartDate),
          cycleEndDate: reminder.cycleEndDate ? new Date(reminder.cycleEndDate) : null,
        };
        
        const reminderTimes = (reminder.reminderTimes as string[]) || [reminder.reminderTime];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const nextTimes = getNextNotificationTimes(cycleConfig, reminderTimes, tomorrow);
        
        if (nextTimes.length > 0) {
          nextOccurrence = nextTimes.reduce((earliest, current) => 
            current < earliest ? current : earliest
          );
        }
      } else if (reminder.reminderType === "calendar") {
        // Increment completed occurrences for calendar reminders
        const newCompletedCount = (reminder.completedOccurrences || 0) + 1;
        
        // Calculate next occurrence using the new function
        const reminderWithUpdatedCount = {
          ...reminder,
          completedOccurrences: newCompletedCount,
        };
        nextOccurrence = calculateNextCalendarOccurrence(reminderWithUpdatedCount);
      }
      
      const updateData: any = { nextOccurrence };
      if (reminder.reminderType === "calendar") {
        updateData.completedOccurrences = (reminder.completedOccurrences || 0) + 1;
      }
      
      const updatedReminder = await storage.updateReminder(reminder.id, updateData);
      
      res.json(updatedReminder);
    } catch (error) {
      console.error("Complete reminder error:", error);
      res.status(500).json({ message: "Failed to complete reminder" });
    }
  });

  app.get("/api/reminders/:id/cycle-status", async (req: Request, res: Response) => {
    try {
      const reminder = await storage.getReminder(req.params.id);
      
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      if (reminder.reminderType !== "cycle" || !reminder.cycleDayStart || !reminder.cycleDayEnd || !reminder.cycleStartDate) {
        return res.status(400).json({ message: "Not a cycle-based reminder" });
      }
      
      const cycleConfig = {
        cycleDayStart: reminder.cycleDayStart,
        cycleDayEnd: reminder.cycleDayEnd,
        cycleStartDate: new Date(reminder.cycleStartDate),
        cycleEndDate: reminder.cycleEndDate ? new Date(reminder.cycleEndDate) : null,
      };
      
      const cycleStatus = checkCycleDay(cycleConfig);
      const reminderTimes = (reminder.reminderTimes as string[]) || [reminder.reminderTime];
      const nextNotifications = getNextNotificationTimes(cycleConfig, reminderTimes);
      
      res.json({
        ...cycleStatus,
        reminderTimes,
        nextNotifications: nextNotifications.map(d => d.toISOString()),
        cycleLength: reminder.cycleDayEnd,
        activeDays: `Day ${reminder.cycleDayStart} to ${reminder.cycleDayEnd}`,
      });
    } catch (error) {
      console.error("Get cycle status error:", error);
      res.status(500).json({ message: "Failed to get cycle status" });
    }
  });

  // Notification History routes
  app.get("/api/notification-history", async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateDemoUser();
      const history = await storage.getNotificationHistory(user.id);
      res.json(history);
    } catch (error) {
      console.error("Get notification history error:", error);
      res.status(500).json({ message: "Failed to get notification history" });
    }
  });

  // User settings routes
  app.put("/api/settings/snooze", async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateDemoUser();
      const { snoozeDuration } = req.body;
      
      const updatedUser = await storage.updateUser(user.id, { snoozeDuration });
      res.json({ snoozeDuration: updatedUser?.snoozeDuration });
    } catch (error) {
      console.error("Update snooze settings error:", error);
      res.status(500).json({ message: "Failed to update snooze settings" });
    }
  });

  app.put("/api/settings/alarm-sound", async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateDemoUser();
      const { selectedAlarmSound } = req.body;
      
      const updatedUser = await storage.updateUser(user.id, { selectedAlarmSound });
      res.json({ selectedAlarmSound: updatedUser?.selectedAlarmSound });
    } catch (error) {
      console.error("Update alarm sound error:", error);
      res.status(500).json({ message: "Failed to update alarm sound" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
