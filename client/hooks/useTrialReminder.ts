import { useState, useEffect, useCallback } from "react";
import {
  getTrialReminderState,
  setTrialReminderState,
  snoozeTrialReminder,
  clearTrialReminderState,
} from "@/services/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

function getActiveMilestone(days: number): number | null {
  if (days === 6) return 6;
  if (days === 4) return 4;
  if (days === 2) return 2;
  if (days === 1) return 1;
  if (days <= 0) return 0;
  return null;
}

export interface TrialReminderView {
  showReminder: boolean;
  reminderDay: number | null;
  showUpgradeCard: boolean;
  remindLater: () => Promise<void>;
  upgrade: () => Promise<void>;
  dismissUpgradeCard: () => Promise<void>;
}

/**
 * Drives the two mutually-exclusive trial surfaces on the Home screen:
 *  1. A trial-ending reminder card (active reminder, days 6/4/2/1/0).
 *  2. An upgrade CTA card (promo only) shown once the trial has ended and
 *     there is no active or snoozed trial reminder pending.
 *
 * 24h auto-dismiss applies to ALL milestone reminders (not just day 0).
 * For milestone 0 we track "ended today" vs "ended 1+ days ago" via the
 * trial start date so that users who open the app days after expiry see
 * the upgrade card immediately instead of a fresh reminder.
 */
export function useTrialReminder(
  daysLeft: number,
  isSubscribed: boolean,
  nowTick: number,
  trialStartDate: Date | null,
): TrialReminderView {
  const [view, setView] = useState<{
    showReminder: boolean;
    reminderDay: number | null;
    showUpgradeCard: boolean;
  }>({
    showReminder: false,
    reminderDay: null,
    showUpgradeCard: false,
  });

  const recompute = useCallback(async () => {
    if (isSubscribed) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: false });
      return;
    }

    const milestone = getActiveMilestone(daysLeft);
    if (milestone === null) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: false });
      return;
    }

    const s = await getTrialReminderState();
    const now = Date.now();
    let changed = false;

    // Once the user taps Upgrade, all trial reminders are permanently resolved
    // across every milestone. Only becoming subscribed clears it.
    if (s.resolved) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: false });
      return;
    }

    // A different milestone means a fresh reminder instance. Older un-actioned
    // reminders are replaced by the newer one.
    if (s.day !== milestone) {
      s.day = milestone;
      s.snoozeUntil = null;
      s.abandoned = false;
      if (milestone === 0) {
        // Track when the trial ended (for "ended today" vs "ended days ago")
        if (s.endedAt === null) {
          if (trialStartDate) {
            const trialEndDate = new Date(trialStartDate);
            trialEndDate.setDate(trialEndDate.getDate() + 30);
            trialEndDate.setHours(0, 0, 0, 0);
            s.endedAt = trialEndDate.getTime();
          } else {
            s.endedAt = now;
          }
        }
        // If the trial ended more than 24h ago, don't show a fresh reminder.
        if (s.endedAt && now - s.endedAt >= DAY_MS) {
          s.abandoned = true;
          s.shownAt = null;
        } else {
          s.shownAt = now;
        }
      } else {
        s.shownAt = now;
      }
      changed = true;
    }

    let showReminder = false;
    let showUpgradeCard = false;

    if (s.snoozeUntil && now < s.snoozeUntil) {
      // Snoozed: hidden, and the upgrade card stays suppressed while a
      // snoozed reminder is waiting to reappear.
    } else {
      if (s.snoozeUntil && now >= s.snoozeUntil) {
        s.snoozeUntil = null;
        s.shownAt = now;
        s.abandoned = false;
        changed = true;
      }

      // 24h auto-dismiss applies to all milestone reminders
      if (!s.abandoned && s.shownAt && now - s.shownAt >= DAY_MS) {
        s.abandoned = true;
        changed = true;
      }

      if (s.abandoned) {
        if (milestone === 0) {
          showUpgradeCard = !s.upgradeCardDismissed;
        }
        // Non-0 milestones: nothing to show after abandon
      } else if (s.shownAt) {
        showReminder = true;
      }
    }

    if (changed) await setTrialReminderState(s);
    setView({ showReminder, reminderDay: s.day, showUpgradeCard });
  }, [daysLeft, isSubscribed, nowTick, trialStartDate]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const remindLater = useCallback(async () => {
    const milestone = getActiveMilestone(daysLeft);
    await snoozeTrialReminder(milestone ?? 0);
    await recompute();
  }, [daysLeft, recompute]);

  const upgrade = useCallback(async () => {
    const milestone = getActiveMilestone(daysLeft);
    await clearTrialReminderState(milestone ?? 0);
    await recompute();
  }, [daysLeft, recompute]);

  const dismissUpgradeCard = useCallback(async () => {
    const s = await getTrialReminderState();
    s.upgradeCardDismissed = true;
    await setTrialReminderState(s);
    await recompute();
  }, [recompute]);

  return { ...view, remindLater, upgrade, dismissUpgradeCard };
}
