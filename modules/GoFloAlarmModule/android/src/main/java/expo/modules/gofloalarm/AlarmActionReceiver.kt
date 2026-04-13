package expo.modules.gofloalarm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.util.Calendar

private const val TAG = "GoFloAlarm"

/**
 * Handles notification action button taps (Take / Snooze / Skip).
 *
 * Runs in the background even when the app is fully killed.
 *
 * PoC scope: Take is fully implemented. Snooze + Skip update the occurrence
 * row and schedule next alarm / snooze alarm respectively.
 */
class AlarmActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra(AlarmExtras.ACTION) ?: run {
            Log.w(TAG, "[AlarmActionReceiver] Missing action — ignoring")
            return
        }
        val reminderId = intent.getStringExtra(AlarmExtras.REMINDER_ID) ?: run {
            Log.w(TAG, "[AlarmActionReceiver] Missing reminderId — ignoring")
            return
        }
        val occurrenceId = intent.getStringExtra(AlarmExtras.OCCURRENCE_ID) ?: run {
            Log.w(TAG, "[AlarmActionReceiver] Missing occurrenceId — ignoring")
            return
        }
        val reminderTitle = intent.getStringExtra(AlarmExtras.REMINDER_TITLE) ?: ""
        val notes = intent.getStringExtra(AlarmExtras.NOTES) ?: ""
        val repeatInterval = intent.getIntExtra(AlarmExtras.REPEAT_INTERVAL, 1)
        val calendarStartDate = intent.getStringExtra(AlarmExtras.CALENDAR_START_DATE)
        val calendarEndDate = intent.getStringExtra(AlarmExtras.CALENDAR_END_DATE)
        val calendarEndsType = intent.getStringExtra(AlarmExtras.CALENDAR_ENDS_TYPE) ?: "never"
        val maxOccurrencesRaw = intent.getIntExtra(AlarmExtras.MAX_OCCURRENCES, -1)
        val maxOccurrences = if (maxOccurrencesRaw == -1) null else maxOccurrencesRaw
        val completedOccurrences = intent.getIntExtra(AlarmExtras.COMPLETED_OCCURRENCES, 0)
        val reminderTime = intent.getStringExtra(AlarmExtras.REMINDER_TIME) ?: "09:00"
        val soundEnabled = intent.getBooleanExtra(AlarmExtras.SOUND_ENABLED, false)

        Log.d(TAG, "[AlarmActionReceiver] action=$action reminderId=$reminderId occurrenceId=$occurrenceId")

        // 1. Dismiss the notification.
        val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notifManager.cancel(reminderId.hashCode())
        Log.d(TAG, "[AlarmActionReceiver] Notification dismissed for reminderId=$reminderId")

        val now = NextOccurrenceCalculator.calendarToIso(Calendar.getInstance())

        when (action) {
            "take" -> {
                updateOccurrenceStatus(context, occurrenceId, "taken", now)
                // Schedule next occurrence with completedOccurrences + 1.
                scheduleNext(
                    context, reminderId, reminderTitle, notes,
                    repeatInterval, calendarStartDate, calendarEndDate, calendarEndsType,
                    maxOccurrences, completedOccurrences + 1, reminderTime, soundEnabled,
                )
                Log.d(TAG, "[AlarmActionReceiver] Take processed for occurrenceId=$occurrenceId")
            }

            "skip" -> {
                updateOccurrenceStatus(context, occurrenceId, "skipped", now)
                scheduleNext(
                    context, reminderId, reminderTitle, notes,
                    repeatInterval, calendarStartDate, calendarEndDate, calendarEndsType,
                    maxOccurrences, completedOccurrences, reminderTime, soundEnabled,
                )
                Log.d(TAG, "[AlarmActionReceiver] Skip processed for occurrenceId=$occurrenceId")
            }

            "snooze" -> {
                val snoozeMinutes = 60
                val snoozedUntil = Calendar.getInstance().apply {
                    add(Calendar.MINUTE, snoozeMinutes)
                }
                val snoozedUntilIso = NextOccurrenceCalculator.calendarToIso(snoozedUntil)
                updateOccurrenceSnooze(context, occurrenceId, now, snoozedUntilIso)

                AlarmScheduler.scheduleAlarmAt(
                    context = context,
                    reminderId = reminderId,
                    reminderTitle = reminderTitle,
                    notes = notes,
                    repeatInterval = repeatInterval,
                    calendarStartDate = calendarStartDate,
                    calendarEndDate = calendarEndDate,
                    calendarEndsType = calendarEndsType,
                    maxOccurrences = maxOccurrences,
                    completedOccurrences = completedOccurrences,
                    reminderTime = reminderTime,
                    soundEnabled = soundEnabled,
                    triggerTime = snoozedUntil,
                )
                Log.d(TAG, "[AlarmActionReceiver] Snooze processed — next alarm at $snoozedUntilIso")
            }

            else -> Log.w(TAG, "[AlarmActionReceiver] Unknown action '$action' — ignoring")
        }
    }

    private fun updateOccurrenceStatus(context: Context, occurrenceId: String, status: String, actionedAt: String) {
        withDb(context) { db ->
            db.execSQL(
                "UPDATE occurrences SET status = ?, actioned_at = ? WHERE id = ?",
                arrayOf(status, actionedAt, occurrenceId),
            )
            Log.d(TAG, "[AlarmActionReceiver] occurrence=$occurrenceId status=$status actionedAt=$actionedAt")
        }
    }

    private fun updateOccurrenceSnooze(
        context: Context,
        occurrenceId: String,
        actionedAt: String,
        snoozedUntil: String,
    ) {
        withDb(context) { db ->
            db.execSQL(
                "UPDATE occurrences SET status = 'snoozed', actioned_at = ?, snoozed_until = ? WHERE id = ?",
                arrayOf(actionedAt, snoozedUntil, occurrenceId),
            )
            Log.d(TAG, "[AlarmActionReceiver] occurrence=$occurrenceId snoozed until $snoozedUntil")
        }
    }

    private fun scheduleNext(
        context: Context,
        reminderId: String,
        reminderTitle: String,
        notes: String,
        repeatInterval: Int,
        calendarStartDate: String?,
        calendarEndDate: String?,
        calendarEndsType: String,
        maxOccurrences: Int?,
        completedOccurrences: Int,
        reminderTime: String,
        soundEnabled: Boolean,
    ) {
        val next = NextOccurrenceCalculator.calculateNextIntervalOccurrence(
            repeatInterval = repeatInterval,
            calendarStartDate = calendarStartDate,
            calendarEndDate = calendarEndDate,
            calendarEndsType = calendarEndsType,
            maxOccurrences = maxOccurrences,
            completedOccurrences = completedOccurrences,
            reminderTime = reminderTime,
        )
        if (next == null) {
            Log.d(TAG, "[AlarmActionReceiver] Schedule exhausted for reminderId=$reminderId")
            return
        }
        AlarmScheduler.scheduleAlarmAt(
            context = context,
            reminderId = reminderId,
            reminderTitle = reminderTitle,
            notes = notes,
            repeatInterval = repeatInterval,
            calendarStartDate = calendarStartDate,
            calendarEndDate = calendarEndDate,
            calendarEndsType = calendarEndsType,
            maxOccurrences = maxOccurrences,
            completedOccurrences = completedOccurrences,
            reminderTime = reminderTime,
            soundEnabled = soundEnabled,
            triggerTime = next,
        )
    }

    private fun withDb(context: Context, block: (SQLiteDatabase) -> Unit) {
        try {
            val dbFile = context.getDatabasePath("goflo.db")
            if (!dbFile.exists()) {
                Log.w(TAG, "[AlarmActionReceiver] DB not found — skipping SQLite write")
                return
            }
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            db.use(block)
        } catch (e: Exception) {
            Log.e(TAG, "[AlarmActionReceiver] SQLite error: ${e.message}", e)
        }
    }
}
