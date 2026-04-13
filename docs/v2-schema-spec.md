# GoFlo V2 Reminder Schema — Locked Spec

**Status: LOCKED**
This document is the source of truth for all V2 tasks. No migration code may be written until this spec is approved. No deviation from this spec is permitted without updating this document first.

---

## Problem with V1

The V1 schema mixes two different concerns in the `reminders` table:

- **Rule columns** — what should happen (title, times, cycle settings, repeat settings). These belong in the reminders table permanently.
- **Engine state columns** — what is currently scheduled (`next_occurrence`). These belong to the scheduling engine, not the rule definition.
- **Derived counters** — `completed_occurrences` is a count that can be derived from the occurrences table. Storing it separately creates a sync problem between the two.

There is also no `occurrences` table. Each delivered reminder instance has no independent record until the user acts on it. The `notification_history` table partially fills this gap but was designed for the JS layer, not the native engine.

---

## V2 Goals

1. The `reminders` table contains rules only — no engine state.
2. Every scheduled instance of a reminder is a row in the `occurrences` table from the moment it is scheduled.
3. The native engine owns writing to `occurrences`. The RN JS layer reads it for display.
4. `notification_history` is retired — `occurrences` replaces it completely.
5. The schema is usable directly by native Kotlin (Android) and Swift (iOS) without any JS intermediary.

---

## V2 SQLite Schema (local device database)

### Table: `reminders`

Rules only. No engine state.

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  notes                TEXT,

  -- Reminder type: 'cycle' or 'calendar'
  reminder_type        TEXT NOT NULL,

  -- Cycle reminder columns (reminder_type = 'cycle')
  cycle_interval_days  INTEGER,          -- Total cycle length in days (e.g. 28)
  cycle_day_start      INTEGER,          -- First active day within cycle (e.g. 14)
  cycle_day_end        INTEGER,          -- Last active day within cycle (e.g. 28)
  cycle_start_date     TEXT,             -- ISO date: when the cycle epoch began
  cycle_end_date       TEXT,             -- ISO date: optional hard stop date for cycle

  -- Calendar reminder columns (reminder_type = 'calendar')
  -- Covers: weekly repeat, fixed interval, and specific dates
  weekly_repeat_days   TEXT,             -- JSON array of day names: ["mon","wed","fri"]
  repeat_interval      INTEGER DEFAULT 1, -- Every N units (e.g. every 2 weeks)
  repeat_unit          TEXT DEFAULT 'week', -- 'week' or 'day'
  calendar_start_date  TEXT,             -- ISO date: when this reminder begins
  calendar_end_date    TEXT,             -- ISO date: optional end date
  calendar_ends_type   TEXT DEFAULT 'never', -- 'never', 'on', or 'after'
  max_occurrences      INTEGER,          -- Used when calendar_ends_type = 'after'
  specific_dates       TEXT,             -- JSON array of ISO date strings (one-off dates)

  -- Time settings
  reminder_time        TEXT NOT NULL,    -- Primary time HH:MM (always set)
  reminder_times       TEXT,             -- JSON array of HH:MM strings for multi-time reminders

  -- Notification settings
  sound_enabled        INTEGER DEFAULT 0, -- 1 = play sound with notification

  -- Status
  is_active            INTEGER DEFAULT 1, -- 1 = active, 0 = paused by user
  created_at           TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at           TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Columns removed from V1:**

| V1 Column | Reason Removed |
|---|---|
| `next_occurrence` | Engine state. Native engine computes this; it is never stored in the reminders table again. |
| `completed_occurrences` | Derived value. Computed from `COUNT(*) WHERE reminder_id = ? AND status IN ('taken','skipped')` on the occurrences table. |
| `alarm_type` | Deprecated. Was already marked deprecated in server schema. Removed. |

---

### Table: `occurrences`

Every scheduled reminder instance is a row. Created by the native engine when an alarm is set. Updated by the native engine when an action is taken.

```sql
CREATE TABLE IF NOT EXISTS occurrences (
  id               TEXT PRIMARY KEY,
  reminder_id      TEXT NOT NULL,         -- FK to reminders.id
  snapshot_title   TEXT NOT NULL,         -- Title at scheduling time (survives rename/delete)
  scheduled_at     TEXT NOT NULL,         -- ISO datetime: when this instance was due to fire
  status           TEXT NOT NULL,         -- See status values below
  actioned_at      TEXT,                  -- ISO datetime: when user tapped Take/Skip/Snooze
  snoozed_until    TEXT,                  -- ISO datetime: only set when status = 'snoozed'
  notification_id  TEXT,                  -- OS notification identifier (for programmatic dismiss)
  created_at       TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Status values:**

| Value | Meaning |
|---|---|
| `pending` | Alarm has fired, notification is visible, user has not acted yet |
| `taken` | User tapped Take |
| `skipped` | User tapped Skip |
| `snoozed` | User tapped Snooze — a new alarm has been set for `snoozed_until` |
| `missed` | Notification was not acted on and has expired (future: set on next engine wake) |

**Why `snapshot_title`:** The history screen must be able to show the reminder title even if the reminder was subsequently renamed or deleted. The snapshot captures the title at scheduling time.

**Why `notification_id`:** When the user acts on a notification, the native engine must programmatically dismiss the notification banner. The OS notification ID is needed for this and is not reliably retrievable later.

---

### Table: `settings`

Unchanged from V1.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

---

## Column Mapping: V1 → V2

### `reminders` table

| V1 Column | V2 Column | Change |
|---|---|---|
| `id` | `id` | Unchanged |
| `title` | `title` | Unchanged |
| `notes` | `notes` | Unchanged |
| `reminder_type` | `reminder_type` | Unchanged. Values 'cycle' and 'calendar' are kept. |
| `cycle_interval_days` | `cycle_interval_days` | Unchanged |
| `cycle_day_start` | `cycle_day_start` | Unchanged |
| `cycle_day_end` | `cycle_day_end` | Unchanged |
| `cycle_start_date` | `cycle_start_date` | Unchanged |
| `cycle_end_date` | `cycle_end_date` | Unchanged |
| `weekly_repeat_days` | `weekly_repeat_days` | Unchanged |
| `repeat_interval` | `repeat_interval` | Unchanged |
| `repeat_unit` | `repeat_unit` | Unchanged |
| `calendar_start_date` | `calendar_start_date` | Unchanged |
| `calendar_end_date` | `calendar_end_date` | Unchanged |
| `calendar_ends_type` | `calendar_ends_type` | Unchanged |
| `max_occurrences` | `max_occurrences` | Unchanged |
| `completed_occurrences` | *(removed)* | Derived from occurrences table. Migration: no data migration needed — value is recomputed. |
| `specific_dates` | `specific_dates` | Unchanged |
| `reminder_time` | `reminder_time` | Unchanged |
| `reminder_times` | `reminder_times` | Unchanged |
| `alarm_type` | *(removed)* | Deprecated. No migration needed. |
| `sound_enabled` | `sound_enabled` | Unchanged |
| `next_occurrence` | *(removed)* | Engine state. Not migrated. Recomputed by native engine on first run. |
| `is_active` | `is_active` | Unchanged |
| `created_at` | `created_at` | Unchanged |
| `updated_at` | `updated_at` | Unchanged |

### `notification_history` table → `occurrences` table

| V1 Column | V2 Column | Notes |
|---|---|---|
| `id` | `id` | Direct migration |
| `reminder_id` | `reminder_id` | Direct migration |
| `title` | `snapshot_title` | Direct migration |
| `scheduled_at` | `scheduled_at` | Direct migration |
| `status` | `status` | Value mapping: 'completed' → 'taken'. 'snoozed' and 'missed' are unchanged. |
| `snoozed_until` | `snoozed_until` | Direct migration |
| `completed_at` | `actioned_at` | Renamed. Direct migration of value. |
| `created_at` | `created_at` | Direct migration |
| *(new)* | `notification_id` | NULL for all migrated rows — historical records have no OS notification ID. |

---

## Storage Ownership

This is a locked decision. Both layers must respect these boundaries.

| Operation | Owner | Table Written |
|---|---|---|
| Create reminder | RN JS layer | `reminders` |
| Update reminder rule | RN JS layer | `reminders` |
| Delete / deactivate reminder | RN JS layer | `reminders` |
| Schedule an alarm | Native engine | `occurrences` (creates row with status='pending') |
| Process Take action | Native engine | `occurrences` (updates status → 'taken', sets actioned_at) |
| Process Skip action | Native engine | `occurrences` (updates status → 'skipped', sets actioned_at) |
| Process Snooze action | Native engine | `occurrences` (updates status → 'snoozed', sets snoozed_until, actioned_at) |
| Read reminders for display | RN JS layer | `reminders` (read only) |
| Read history for display | RN JS layer | `occurrences` (read only) |
| Read reminders to compute next alarm | Native engine | `reminders` (read only) |

**The RN JS layer does NOT write to `occurrences` in normal operation.**
The only time JS writes to `occurrences` is during the one-time migration that populates it from `notification_history`.

---

## Migration Plan

Full migration code is out of scope for Task #28 (see Task #34). The steps and risks are documented here so the migration task has no ambiguity.

### Step Order

1. **Create `occurrences` table** — additive, safe. No data changed.
2. **Populate `occurrences` from `notification_history`** — insert migrated rows with mapped columns and status values. This runs before any reads from `occurrences`.
3. **Rebuild `reminders` table without dropped columns** — SQLite does not support `DROP COLUMN` reliably. The migration must:
   - `CREATE TABLE reminders_new` with V2 schema
   - `INSERT INTO reminders_new SELECT ... FROM reminders` (map columns, omit dropped ones)
   - `DROP TABLE reminders`
   - `ALTER TABLE reminders_new RENAME TO reminders`
4. **Drop `notification_history`** — only after step 2 is verified complete.

### Data Loss Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `reminders` data lost if step 3 fails mid-way | Low | Do not drop original until `reminders_new` row count matches. Verify before rename. |
| `notification_history` data lost if migration fails at step 2 | Low | Do not drop `notification_history` until `occurrences` row count matches. |
| `completed_occurrences` value lost | None | Not migrated — recomputed from `occurrences` on first query. Historical `notification_history` rows give the correct count after migration. |
| `next_occurrence` value lost | None | Not a rule — recomputed by native engine on first run. |
| History entries for deleted reminders | Low | `reminder_id` in `occurrences` is not a strict FK with cascade — historical entries for deleted reminders are retained as orphans and are valid for display. |

### Rollback Strategy

- Run the migration inside a SQLite `BEGIN TRANSACTION` / `COMMIT` block.
- On any error, `ROLLBACK` — the database is left in V1 state and the app continues working on V1.
- The app version that ships V2 schema must detect whether migration has already run (check for `occurrences` table existence) and skip if already complete.

---

## What Is Not Changing

- The three-table structure (reminders, occurrences/history, settings) is the same logical shape.
- Column names and types for all rule columns on `reminders` are identical — no renaming, no type changes.
- The `settings` table is untouched.
- The server-side Postgres schema (`shared/schema.ts`) is out of scope for V2 native engine tasks. The server remains as a supplementary push notification safety net and is not being rearchitected.
- The web fallback (AsyncStorage) path in `LocalDatabase.ts` is out of scope. Web does not run the native engine.
