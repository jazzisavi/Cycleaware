import { useState, useEffect, useCallback } from "react";
import {
  getTrialReminderState,
  setTrialReminderState,
  snoozeTrialReminder,
} from "@/services/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

function getActiveMilestone(days: number): number | null {
  if (days <= 0) return 0;
  if (days <= 1) return 1;
  if (days <= 2) return 2;
  if (days <= 4) return 4;
  if (days <= 6) return 6;
  return null;
}

export interface TrialReminderView {
  showReminder: boolean;
  reminderDay: number | null;
  showUpgradeCard: boolean;
  remindLater: () => Promise<void>;
  dismissUpgradeCard: () => Promise<void>;
}

/**
 * Drives the two mutually-exclusive trial surfaces on the Home screen:
 *  1. A trial-ending reminder card (an active reminder, days 6/4/2/1/0).
 *  2. An upgrade CTA card (promo only) shown once the trial has ended and
 *     there is no active or snoozed trial reminder pending.
 */
export function useTrialReminder(
  daysLeft: number,
  isSubscribed: boolean,
  nowTick: number,
): TrialReminderView {
  const [view, setView] = useState<{ showReminder: boolean; reminderDay: number | null; showUpgradeCard: boolean }>({
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

    // A different milestone means a fresh reminder instance. Older un-actioned
    // reminders are replaced by the newer one.
    if (s.day !== milestone) {
      s.day = milestone;
      s.shownAt = now;
      s.snoozeUntil = null;
      s.abandoned = false;
      s.upgradeCardDismissed = false;
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

      if (milestone === 0) {
        // After the trial ends, an un-actioned reminder is auto-dismissed
        // after 24h, at which point the upgrade card takes its place.
        if (!s.abandoned && s.shownAt && now - s.shownAt >= DAY_MS) {
          s.abandoned = true;
          changed = true;
        }
        if (s.abandoned) {
          showUpgradeCard = !s.upgradeCardDismissed;
        } else {
          showReminder = true;
        }
      } else {
        showReminder = true;
      }
    }

    if (changed) await setTrialReminderState(s);
    setView({ showReminder, reminderDay: s.day, showUpgradeCard });
  }, [daysLeft, isSubscribed, nowTick]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const remindLater = useCallback(async () => {
    const milestone = getActiveMilestone(daysLeft);
    await snoozeTrialReminder(milestone ?? 0);
    await recompute();
  }, [daysLeft, recompute]);

  const dismissUpgradeCard = useCallback(async () => {
    const s = await getTrialReminderState();
    s.upgradeCardDismissed = true;
    await setTrialReminderState(s);
    await recompute();
  }, [recompute]);

  return { ...view, remindLater, dismissUpgradeCard };
}
