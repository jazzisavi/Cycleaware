package expo.modules.gofloalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

private const val TAG = "GoFloAlarm"

internal object AlarmScheduler {

    fun scheduleAlarm(context: Context, params: Map<String, Any?>): Boolean {
        val reminderId = params[AlarmExtras.REMINDER_ID] as? String ?: return false
        val reminderTitle = params[AlarmExtras.REMINDER_TITLE] as? String ?: ""
        val notes = params[AlarmExtras.NOTES] as? String ?: ""
        val repeatInterval = (params[AlarmExtras.REPEAT_INTERVAL] as? Number)?.toInt() ?: 1
        val calendarStartDate = params[AlarmExtras.CALENDAR_START_DATE] as? String
        val calendarEndDate = params[AlarmExtras.CALENDAR_END_DATE] as? String
        val calendarEndsType = params[AlarmExtras.CALENDAR_ENDS_TYPE] as? String ?: "never"
        val maxOccurrences = (params[AlarmExtras.MAX_OCCURRENCES] as? Number)?.toInt()
        val completedOccurrences = (params[AlarmExtras.COMPLETED_OCCURRENCES] as? Number)?.toInt() ?: 0
        val reminderTime = params[AlarmExtras.REMINDER_TIME] as? String ?: "09:00"
        val soundEnabled = params[AlarmExtras.SOUND_ENABLED] as? Boolean ?: false

        val nextOccurrence = NextOccurrenceCalculator.calculateNextIntervalOccurrence(
            repeatInterval = repeatInterval,
            calendarStartDate = calendarStartDate,
            calendarEndDate = calendarEndDate,
            calendarEndsType = calendarEndsType,
            maxOccurrences = maxOccurrences,
            completedOccurrences = completedOccurrences,
            reminderTime = reminderTime,
        ) ?: run {
            Log.d(TAG, "[AlarmScheduler] No next occurrence for reminderId=$reminderId — schedule exhausted")
            return false
        }

        return scheduleAlarmAt(
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
            triggerTime = nextOccurrence,
        )
    }

    fun scheduleAlarmAt(
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
        triggerTime: Calendar,
    ): Boolean {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Log.w(TAG, "[AlarmScheduler] Cannot schedule exact alarms — permission not granted")
            return false
        }

        val scheduledAt = NextOccurrenceCalculator.calendarToIso(triggerTime)

        val intent = Intent(context, AlarmFireReceiver::class.java).apply {
            putExtra(AlarmExtras.REMINDER_ID, reminderId)
            putExtra(AlarmExtras.REMINDER_TITLE, reminderTitle)
            putExtra(AlarmExtras.NOTES, notes)
            putExtra(AlarmExtras.REPEAT_INTERVAL, repeatInterval)
            putExtra(AlarmExtras.CALENDAR_START_DATE, calendarStartDate)
            putExtra(AlarmExtras.CALENDAR_END_DATE, calendarEndDate)
            putExtra(AlarmExtras.CALENDAR_ENDS_TYPE, calendarEndsType)
            putExtra(AlarmExtras.MAX_OCCURRENCES, maxOccurrences ?: -1)
            putExtra(AlarmExtras.COMPLETED_OCCURRENCES, completedOccurrences)
            putExtra(AlarmExtras.REMINDER_TIME, reminderTime)
            putExtra(AlarmExtras.SOUND_ENABLED, soundEnabled)
            putExtra(AlarmExtras.SCHEDULED_AT, scheduledAt)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminderId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerTime.timeInMillis,
            pendingIntent,
        )

        Log.d(TAG, "[AlarmScheduler] Alarm set for reminderId=$reminderId at $scheduledAt")
        return true
    }

    /**
     * Schedules a test alarm N seconds from now.
     * Used only for PoC verification — not part of the production flow.
     */
    fun scheduleTestAlarm(context: Context, reminderId: String, delaySeconds: Int): Boolean {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Log.w(TAG, "[AlarmScheduler] Cannot schedule exact alarms — permission not granted")
            return false
        }

        val triggerMs = System.currentTimeMillis() + (delaySeconds * 1000L)
        val scheduledAt = NextOccurrenceCalculator.calendarToIso(Calendar.getInstance().apply {
            timeInMillis = triggerMs
        })

        val intent = Intent(context, AlarmFireReceiver::class.java).apply {
            putExtra(AlarmExtras.REMINDER_ID, reminderId)
            putExtra(AlarmExtras.REMINDER_TITLE, "GoFlo PoC Test")
            putExtra(AlarmExtras.NOTES, "Proof-of-concept alarm — check logcat for [GoFloAlarm] tags")
            putExtra(AlarmExtras.REPEAT_INTERVAL, 1)
            putExtra(AlarmExtras.CALENDAR_ENDS_TYPE, "never")
            putExtra(AlarmExtras.MAX_OCCURRENCES, -1)
            putExtra(AlarmExtras.COMPLETED_OCCURRENCES, 0)
            putExtra(AlarmExtras.REMINDER_TIME, "09:00")
            putExtra(AlarmExtras.SOUND_ENABLED, false)
            putExtra(AlarmExtras.SCHEDULED_AT, scheduledAt)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminderId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pendingIntent)
        Log.d(TAG, "[AlarmScheduler] Test alarm scheduled in ${delaySeconds}s for reminderId=$reminderId")
        return true
    }

    fun cancelAlarm(context: Context, reminderId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmFireReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminderId.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )
        pendingIntent?.let {
            alarmManager.cancel(it)
            Log.d(TAG, "[AlarmScheduler] Alarm cancelled for reminderId=$reminderId")
        }
    }

    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return alarmManager.canScheduleExactAlarms()
    }
}
