# Android Native Alarm Engine — PoC Testing Guide

**Task #30 proof deliverable.** Follow these steps on a physical Android device.

> **Replit environment note:** The Replit container has no Android SDK, emulator, or ADB
> access. On-device verification must be performed by the developer after pulling the branch,
> running `expo prebuild`, and installing a development build on a physical device.
> The logcat sequences below are *design-time expected output* derived directly from the
> log statements in the Kotlin source. Replace them with your captured output when you
> complete the on-device run and commit the updated proof section at the bottom of this file.

---

## What this proves

| Step | What it validates |
|---|---|
| `scheduleTestAlarm()` succeeds | Native module callable from JS; AlarmManager accepts exact alarms |
| Notification fires with Take/Snooze/Skip buttons | AlarmFireReceiver runs in killed state; `occurrences` row written with `status='pending'` |
| "Take" action processes without app opening | AlarmActionReceiver runs in killed state; SQLite updated to `status='taken'`; next alarm re-scheduled |

---

## Prerequisites

1. **Build a development client** (not Expo Go — Expo Go on Android does not run custom native modules):

   ```bash
   eas build --profile development --platform android
   ```

   Or run a local build if you have Android SDK set up:

   ```bash
   npx expo prebuild --platform android
   npx expo run:android
   ```

2. **Install the APK** on a physical Android device.

3. **Grant exact alarm permission** — Android 12+ requires this manually:
   - Open the app and navigate to the `AlarmTestScreen`
   - Tap "Check Permission" — if it shows NOT GRANTED, tap "Open Settings"
   - In the system settings screen, enable "Alarms & Reminders" for GoFlo
   - Return to the app

---

## Adding the test screen to navigation (temporary)

In your navigator (e.g. `MoreScreen.tsx` or any stack), add:

```typescript
import AlarmTestScreen from './AlarmTestScreen';
// ...
<Stack.Screen name="AlarmTest" component={AlarmTestScreen} />
```

Then navigate to it from any button:

```typescript
navigation.navigate('AlarmTest');
```

---

## Test procedure

### Step 1 — Schedule the test alarm

1. Open the app on the device.
2. Navigate to **AlarmTestScreen**.
3. Tap **"Check Permission"** — confirm GRANTED.
4. Tap **"Alarm in 30s"**.
5. The log should show: `Test alarm scheduled in 30s (id: poc-test-reminder-001)`.

### Step 2 — Kill the app completely

- On Android, swipe the app away from the Recents screen.
- The app must be fully killed (not just backgrounded).

### Step 3 — Wait for the notification

- After ~30 seconds, a notification appears:
  - Title: `GoFlo PoC Test`
  - Body: `Proof-of-concept alarm — check logcat for [GoFloAlarm] tags`
  - Action buttons: **Take**, **Snooze**, **Skip**

### Step 4 — Tap Take (do not open the app)

- From the notification shade, tap **Take** without tapping the notification body (which would open the app).
- The notification should dismiss.

### Step 5 — Verify in logcat

Connect the device via USB and run:

```bash
adb logcat -s GoFloAlarm
```

Expected output sequence:

```
D GoFloAlarm [AlarmScheduler] Test alarm scheduled in 30s for reminderId=poc-test-reminder-001
D GoFloAlarm [AlarmFireReceiver] onReceive reminderId=poc-test-reminder-001 title='GoFlo PoC Test' ...
D GoFloAlarm [AlarmFireReceiver] Wrote occurrence id=<uuid> status=pending
D GoFloAlarm [AlarmFireReceiver] Notification shown id=<int> ...
D GoFloAlarm [AlarmActionReceiver] action=take reminderId=poc-test-reminder-001 occurrenceId=<uuid>
D GoFloAlarm [AlarmActionReceiver] Notification dismissed ...
D GoFloAlarm [AlarmActionReceiver] occurrence=<uuid> status=taken actionedAt=<iso>
D GoFloAlarm [AlarmScheduler] Alarm set for reminderId=poc-test-reminder-001 at <next-iso>
```

### Step 6 — Verify SQLite (optional)

```bash
adb shell
run-as com.swopzshop.goflo.app
sqlite3 databases/goflo.db "SELECT id, status, actioned_at FROM occurrences ORDER BY created_at DESC LIMIT 5;"
```

Expected: one row with `status = taken` and a non-null `actioned_at`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `scheduleTestAlarm` returns `false` | Exact alarm permission not granted | Tap "Open Settings" → enable Alarms & Reminders |
| Notification does not appear after 30s | AlarmManager was killed by battery optimisation | Settings → Battery → GoFlo → Unrestricted |
| `AlarmFireReceiver` fires but DB write fails | `goflo.db` does not exist yet | Open the app once so expo-sqlite creates the DB, then run the test |
| Module not found error | Prebuild not run, or dev client not rebuilt after adding module | Re-run `eas build --profile development` or `npx expo run:android` |

---

## Files created in Task #30

| File | Purpose |
|---|---|
| `modules/GoFloAlarmModule/android/src/main/java/expo/modules/gofloalarm/GoFloAlarmModule.kt` | Expo module entry point — JS ↔ Kotlin bridge |
| `modules/GoFloAlarmModule/android/src/main/java/expo/modules/gofloalarm/AlarmScheduler.kt` | AlarmManager scheduling + exact alarm permission check |
| `modules/GoFloAlarmModule/android/src/main/java/expo/modules/gofloalarm/NextOccurrenceCalculator.kt` | Kotlin port of interval calculation from `reminderCalculator.ts` |
| `modules/GoFloAlarmModule/android/src/main/java/expo/modules/gofloalarm/AlarmFireReceiver.kt` | BroadcastReceiver: writes `occurrences` row + shows notification |
| `modules/GoFloAlarmModule/android/src/main/java/expo/modules/gofloalarm/AlarmActionReceiver.kt` | BroadcastReceiver: processes Take/Snooze/Skip from killed state |
| `modules/GoFloAlarmModule/android/src/main/java/expo/modules/gofloalarm/AlarmExtras.kt` | Intent extra key constants |
| `modules/GoFloAlarmModule/android/build.gradle` | Android library build config (uses expo-module-gradle-plugin) |
| `modules/GoFloAlarmModule/android/src/main/AndroidManifest.xml` | Empty manifest (permissions + receivers added by config plugin) |
| `modules/GoFloAlarmModule/package.json` | Module package descriptor |
| `modules/GoFloAlarmModule/expo-module.config.json` | Tells expo-modules-core which class to instantiate |
| `modules/GoFloAlarmModule/src/index.ts` | TypeScript JS bridge |
| `plugins/withGoFloAlarm.js` | Config plugin: adds receivers + permissions to AndroidManifest.xml |
| `client/screens/AlarmTestScreen.tsx` | Temporary test UI for device verification |
| `docs/android-poc-testing.md` | This file |

---

## Out of scope for Task #30 (covered by Task #35)

- Cycle and weekday reminder types (interval only in this PoC)
- Reboot recovery (RECEIVE_BOOT_COMPLETED handler)
- Timezone handling
- Full error handling and edge cases
- Integration with the main RN reminder flow (Task #31)
- Schema migration from `notification_history` to `occurrences` (Task #34)

---

## On-device proof log

**Instructions:** After completing the test procedure above, paste your captured logcat and
SQLite verification output here and commit the file. This section replaces the design-time
expected sequences with real evidence.

### Build context
```
Device:
Android version:
Build profile: development
EAS build ID (or local):
Date:
```

### Captured logcat (adb logcat -s GoFloAlarm)
```
# Paste here after: eas build → install APK → AlarmTestScreen → "Alarm in 30s" → kill app → Take
```

### SQLite verification
```sql
-- paste output of:
-- SELECT id, status, actioned_at FROM occurrences ORDER BY created_at DESC LIMIT 5;
```

### Result
- [ ] scheduleTestAlarm() returned true
- [ ] Notification appeared with Take / Snooze / Skip buttons ~30s after scheduling
- [ ] Notification dismissed after tapping Take with app killed
- [ ] AlarmActionReceiver logcat shows `status=taken`
- [ ] AlarmScheduler logcat shows next alarm scheduled
- [ ] SQLite `occurrences` row shows `status = taken` with non-null `actioned_at`
