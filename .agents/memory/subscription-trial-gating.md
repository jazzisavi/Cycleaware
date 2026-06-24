---
name: Subscription trial gating
description: Architecture of GoFlo/Orbia trial system, gating logic, and key decisions.
---

## Key AsyncStorage keys
- `@orbia/trial_start_date` — ISO string of when trial started (set on onboarding completion)
- `@orbia/dev_trial_override` — dev-only: number of days to override daysLeft for testing
- `@orbia/trial_reminder_state` — persisted state for the two-surface trial reminder / upgrade CTA flow (day, shownAt, snoozeUntil, abandoned, upgradeCardDismissed, endedAt, resolved)

## Two-surface trial flow (HomeScreen)
- **Trial reminder card** (active reminder): shown on exact milestone days 6/4/2/1/0 as first item in "Today's Active Reminders". 24h auto-dismiss for ALL milestones. Snooze = 24h then reappears.
- **Upgrade CTA card** (promo): shown after trial ended (day 0) and reminder abandoned after 24h (or ended 1+ days ago). No push. Below active reminders, not inside them.
- **Mutual exclusion**: `resolved` flag in `TrialReminderState` suppresses both surfaces for the current milestone. `endedAt` (trialStartDate+30days) tracks "ended today" vs "ended days ago".
- **Upgrade action**: `clearTrialReminderState(milestone)` sets `resolved=true` + `day=milestone` and cancels all trial notifications. Prevents resurrection on recompute.

## Trial state computation (`useTrialStatus`)
- Trial = 30 days from `trial_start_date`
- `daysLeft` = days remaining; 0 when expired
- `isInTrial` = trial started and not expired
- `trialExpired` = trial started and daysLeft === 0
- `isPro = isRevenueCatSubscribed || isInTrial` (in SubscriptionContext)

## Cycle gating rules
- `cycleGated = trialExpired && !isPro`
- CreateReminderScreen: cycle frequency blocked (shows InlinePaywall) when cycleGated
- RemindersScreen: cycle reminder cards show locked UI (disabled switch, coral "Upgrade to reactivate" beneath description) when cycleGated
- SubscriptionContext: useEffect fires when `trialExpired && !isSubscribed` to cancel pending cycle reminder notifications via `cancelPendingNotificationsForReminder`

## Dev panel
- Long-press version label (800ms) on ProfileScreen opens dev modal
- Actions: stepper to set daysLeft, clear override, reset trial start
- All actions call `await refreshTrial()` to immediately propagate changes
- `refreshTrial` is exposed through SubscriptionContext (not just useTrialStatus)

## Paywall navigation
- Paywall screen: opaque header, title "Upgrade", only × close button (no back arrow)
- Plans: Orbia Lite (free), Orbia Pro (cycle engine), Orbia Supporter (back the mission)
- RevenueCat entitlement: "pro"

## Reactivation on upgrade/restore
- DB `isActive` state for cycle reminders is NOT changed on trial expiry
- Only notifications are cancelled
- When user subscribes/restores: `syncAllNotifications` re-schedules all isActive=true reminders
- User does not need to manually re-enable reminders after upgrading

**Why:** Changing DB isActive would require tracking which reminders were auto-deactivated to restore them later. Cancelling notifications only is simpler and achieves the same UX since the UI gates on `isPro` at render time.
