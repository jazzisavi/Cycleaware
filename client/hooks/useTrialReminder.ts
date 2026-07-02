import { useState, useEffect, useCallback } from "react";
import {
  getTrialReminderState,
  setTrialReminderState,
  snoozeTrialReminder,
  clearTrialReminderState,
} from "@/services/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

function getActiveMilestone(days: number): number | null {
  // Daily reminders from 7 days left through day 0. Each new day creates a
  // fresh reminder instance; all other mechanics (24h auto-dismiss, snooze,
  // upgrade resolution) are unchanged.
  if (days >= 1 && days <= 7) return days;
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
 * Drives the two mutually-exclusive trial surfaces on the Home screen.
 *
 * A single "active reminder instance" is tracked in AsyncStorage (field `day`).
 * It survives across days until it is:
 *   - Replaced by a newer milestone reminder
 *   - Resolved by the user tapping Upgrade
 *   - Abandoned after 24h of no action
 *   - Snoozed (hidden for 24h, then reappears with the same `day`)
 *
 * This makes push notifications and in-app reminders stay in lockstep: the
 * push is always for the same `day` as the active reminder instance.
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

    const s = await getTrialReminderState();
    const now = Date.now();
    const currentMilestone = getActiveMilestone(daysLeft);

    // 1. Resolved — user tapped Upgrade: suppress everything permanently.
    if (s.resolved) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: false });
      return;
    }

    // 2. A new milestone has been reached — replace the old instance.
    if (currentMilestone !== null && s.day !== currentMilestone) {
      s.day = currentMilestone;
      s.snoozeUntil = null;
      s.abandoned = false;
      s.shownAt = now;
      if (currentMilestone === 0) {
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
        if (s.endedAt && now - s.endedAt >= DAY_MS) {
          s.abandoned = true;
          s.shownAt = null;
        }
      }
      await setTrialReminderState(s);
    }

    // Whenever the trial has ended and the reminder card is NOT actively
    // showing, the upgrade card takes its place (unless dismissed).
    const upgradeCardEligible = daysLeft <= 0 && !s.upgradeCardDismissed;

    // 3. No active reminder instance at all.
    if (s.day === null) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: upgradeCardEligible });
      return;
    }

    // 4. Still snoozed.
    if (s.snoozeUntil && now < s.snoozeUntil) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: upgradeCardEligible });
      return;
    }

    // 5. Snooze just expired — resurface the same instance.
    if (s.snoozeUntil && now >= s.snoozeUntil) {
      s.snoozeUntil = null;
      s.shownAt = now;
      s.abandoned = false;
      await setTrialReminderState(s);
    }

    // 6. 24h auto-dismiss (no action).
    if (!s.abandoned && s.shownAt && now - s.shownAt >= DAY_MS) {
      s.abandoned = true;
      await setTrialReminderState(s);
    }

    // 7. Decide what to render.
    if (s.abandoned) {
      setView({ showReminder: false, reminderDay: null, showUpgradeCard: upgradeCardEligible });
      return;
    }

    // Active reminder is showing.
    setView({ showReminder: true, reminderDay: s.day, showUpgradeCard: false });
  }, [daysLeft, isSubscribed, nowTick, trialStartDate]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const remindLater = useCallback(async () => {
    const s = await getTrialReminderState();
    const activeDay = s.day ?? 0;
    await snoozeTrialReminder(activeDay);
    await recompute();
  }, [recompute]);

  const upgrade = useCallback(async () => {
    const s = await getTrialReminderState();
    const activeDay = s.day ?? 0;
    await clearTrialReminderState(activeDay);
    await recompute();
  }, [recompute]);

  const dismissUpgradeCard = useCallback(async () => {
    const s = await getTrialReminderState();
    s.upgradeCardDismissed = true;
    await setTrialReminderState(s);
    await recompute();
  }, [recompute]);

  return { ...view, remindLater, upgrade, dismissUpgradeCard };
}
