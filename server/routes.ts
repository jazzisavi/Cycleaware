import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertReminderSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { checkCycleDay, getNextNotificationTimes } from "./utils/cycleCalculator";

// Simple session store (in production, use Redis or database sessions)
const sessions = new Map<string, string>();

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
      }
      
      const reminderData = {
        ...req.body,
        userId: user.id,
        nextOccurrence,
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
      } else if (reminder.reminderType === "calendar" && reminder.weeklyRepeatDays) {
        const [hours, minutes] = (reminder.reminderTime || "09:00").split(":").map(Number);
        const weekdays = reminder.weeklyRepeatDays as number[];
        const nextDate = new Date();
        const currentDay = nextDate.getDay();
        
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (weekdays.includes(checkDay)) {
            nextDate.setDate(nextDate.getDate() + i);
            nextDate.setHours(hours, minutes, 0, 0);
            nextOccurrence = nextDate;
            break;
          }
        }
      }
      
      const updatedReminder = await storage.updateReminder(reminder.id, {
        nextOccurrence,
      });
      
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
