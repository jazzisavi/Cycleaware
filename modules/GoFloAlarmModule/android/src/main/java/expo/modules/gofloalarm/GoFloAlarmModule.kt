package expo.modules.gofloalarm

import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "GoFloAlarm"

/**
 * Expo native module for GoFlo's Android alarm engine.
 *
 * JS API:
 *   GoFloAlarmModule.scheduleAlarm(params)         → boolean
 *   GoFloAlarmModule.cancelAlarm(reminderId)        → boolean
 *   GoFloAlarmModule.canScheduleExactAlarms()       → boolean
 *   GoFloAlarmModule.openExactAlarmSettings()       → void
 *   GoFloAlarmModule.scheduleTestAlarm(id, delay)   → boolean  (PoC only)
 */
class GoFloAlarmModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("GoFloAlarmModule")

        /**
         * Schedule an alarm for an interval reminder.
         *
         * params keys: reminderId, reminderTitle, notes, repeatInterval,
         *   calendarStartDate, calendarEndDate, calendarEndsType,
         *   maxOccurrences, completedOccurrences, reminderTime, soundEnabled
         */
        Function("scheduleAlarm") { params: Map<String, Any?> ->
            val context = appContext.reactContext ?: run {
                Log.w(TAG, "[GoFloAlarmModule] No react context")
                return@Function false
            }
            AlarmScheduler.scheduleAlarm(context, params)
        }

        /** Cancel any pending alarm for the given reminderId. */
        Function("cancelAlarm") { reminderId: String ->
            val context = appContext.reactContext ?: return@Function false
            AlarmScheduler.cancelAlarm(context, reminderId)
            true
        }

        /** Returns true when the app holds the SCHEDULE_EXACT_ALARM permission. */
        Function("canScheduleExactAlarms") {
            val context = appContext.reactContext ?: return@Function false
            AlarmScheduler.canScheduleExactAlarms(context)
        }

        /**
         * Opens the system "Alarms & Reminders" settings screen (Android 12+).
         * No-op on older API levels.
         */
        Function("openExactAlarmSettings") {
            val context = appContext.reactContext ?: return@Function
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                try {
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "[GoFloAlarmModule] Could not open alarm settings: ${e.message}")
                }
            }
        }

        /**
         * Schedule a test alarm N seconds from now.
         * Only used for PoC device verification — not part of the production flow.
         */
        Function("scheduleTestAlarm") { reminderId: String, delaySeconds: Int ->
            val context = appContext.reactContext ?: return@Function false
            AlarmScheduler.scheduleTestAlarm(context, reminderId, delaySeconds)
        }
    }
}
