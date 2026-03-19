import { db } from "../db";
import { cycleReminderConfigs, pushTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { checkCycleDay } from "./cycleCalculator";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, any>;
  categoryIdentifier?: string;
  sound?: string;
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("[PushScheduler] Expo push API error:", response.status, await response.text());
    } else {
      const result = await response.json();
      console.log(`[PushScheduler] Sent ${messages.length} push notifications`);
      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === "error") {
            console.error("[PushScheduler] Push ticket error:", ticket.message, ticket.details);
          }
        }
      }
    }
  } catch (error) {
    console.error("[PushScheduler] Failed to send push notifications:", error);
  }
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function runSchedulerTick(): Promise<void> {
  try {
    const configs = await db
      .select({
        config: cycleReminderConfigs,
        token: pushTokens,
      })
      .from(cycleReminderConfigs)
      .innerJoin(pushTokens, eq(cycleReminderConfigs.pushTokenId, pushTokens.id))
      .where(eq(cycleReminderConfigs.isActive, true));

    if (configs.length === 0) return;

    const todayStr = getTodayDateString();
    const currentMinutes = getCurrentTimeMinutes();
    const messages: PushMessage[] = [];
    const updatedConfigIds: { id: string; time: string }[] = [];
    const repromptMessages: PushMessage[] = [];
    const repromptConfigIds: { id: string; repromptKey: string }[] = [];

    for (const { config, token } of configs) {
      const cycleConfig = {
        cycleDayStart: config.cycleDayStart,
        cycleDayEnd: config.cycleDayEnd,
        cycleStartDate: new Date(config.cycleStartDate),
        cycleEndDate: config.cycleEndDate ? new Date(config.cycleEndDate) : null,
      };

      const cycleCheck = checkCycleDay(cycleConfig);

      if (!cycleCheck.isActiveDay) continue;

      const times = config.reminderTimes as string[];
      for (const time of times) {
        const timeMinutes = timeStringToMinutes(time);

        const sentKey = `${todayStr}_${time}`;

        if (Math.abs(currentMinutes - timeMinutes) <= 1) {
          if (config.lastSentAt === sentKey) continue;

          messages.push({
            to: token.token,
            title: config.title,
            body: config.notes || "",
            data: {
              reminderId: config.id,
              soundEnabled: config.soundEnabled,
            },
            categoryIdentifier: "reminder",
          });

          updatedConfigIds.push({ id: config.id, time: sentKey });
        }

        const repromptKey = `${todayStr}_reprompt_${time}`;
        if (
          config.lastSentAt === sentKey &&
          config.lastRepromptAt !== repromptKey &&
          currentMinutes - timeMinutes >= 59 &&
          currentMinutes - timeMinutes <= 61
        ) {
          repromptMessages.push({
            to: token.token,
            title: `Reminder: ${config.title}`,
            body: config.notes || "",
            data: {
              reminderId: config.id,
              soundEnabled: config.soundEnabled,
              isReprompt: true,
            },
            categoryIdentifier: "reminder",
          });

          repromptConfigIds.push({ id: config.id, repromptKey });
        }
      }
    }

    if (messages.length > 0) {
      await sendExpoPush(messages);

      for (const { id, time } of updatedConfigIds) {
        await db
          .update(cycleReminderConfigs)
          .set({ lastSentAt: time, lastSentDate: todayStr, updatedAt: new Date() })
          .where(eq(cycleReminderConfigs.id, id));
      }
    }

    if (repromptMessages.length > 0) {
      await sendExpoPush(repromptMessages);
      console.log(`[PushScheduler] Sent ${repromptMessages.length} re-prompt notifications`);

      for (const { id, repromptKey } of repromptConfigIds) {
        await db
          .update(cycleReminderConfigs)
          .set({ lastRepromptAt: repromptKey, updatedAt: new Date() })
          .where(eq(cycleReminderConfigs.id, id));
      }
    }
  } catch (error) {
    console.error("[PushScheduler] Tick error:", error);
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerInterval) return;

  console.log("[PushScheduler] Starting scheduler (every 60s)");
  runSchedulerTick();

  schedulerInterval = setInterval(runSchedulerTick, 60 * 1000);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[PushScheduler] Scheduler stopped");
  }
}
