package expo.modules.gofloalarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.Calendar
import java.util.UUID

private const val TAG = "GoFloAlarm"
private const val CHANNEL_ID = "goflo_native_alarms"

/**
 * Fires when an AlarmManager alarm triggers.
 *
 * Responsibilities:
 *   1. Write an occurrence row (status = 'pending') to goflo.db.
 *   2. Show a notification with Take / Snooze / Skip action buttons.
 *
 * Runs in the background even when the app is fully killed.
 */
class AlarmFireReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra(AlarmExtras.REMINDER_ID) ?: run {
            Log.w(TAG, "[AlarmFireReceiver] Missing reminderId — ignoring")
            return
        }
        val reminderTitle = intent.getStringExtra(AlarmExtras.REMINDER_TITLE) ?: "Reminder"
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
        val scheduledAt = intent.getStringExtra(AlarmExtras.SCHEDULED_AT)
            ?: NextOccurrenceCalculator.calendarToIso(Calendar.getInstance())

        Log.d(TAG, "[AlarmFireReceiver] onReceive reminderId=$reminderId title='$reminderTitle' scheduledAt=$scheduledAt")

        val occurrenceId = UUID.randomUUID().toString()
        writeOccurrencePending(context, occurrenceId, reminderId, reminderTitle, scheduledAt)

        showNotification(
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
            occurrenceId = occurrenceId,
            scheduledAt = scheduledAt,
        )
    }

    private fun writeOccurrencePending(
        context: Context,
        occurrenceId: String,
        reminderId: String,
        snapshotTitle: String,
        scheduledAt: String,
    ) {
        try {
            val dbFile = context.getDatabasePath("goflo.db")
            if (!dbFile.exists()) {
                Log.w(TAG, "[AlarmFireReceiver] DB not found at ${dbFile.absolutePath} — skipping SQLite write")
                return
            }
            val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
            db.use {
                it.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS occurrences (
                        id               TEXT PRIMARY KEY,
                        reminder_id      TEXT NOT NULL,
                        snapshot_title   TEXT NOT NULL,
                        scheduled_at     TEXT NOT NULL,
                        status           TEXT NOT NULL,
                        actioned_at      TEXT,
                        snoozed_until    TEXT,
                        notification_id  TEXT,
                        created_at       TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                    """.trimIndent(),
                )
                val now = NextOccurrenceCalculator.calendarToIso(Calendar.getInstance())
                it.execSQL(
                    "INSERT INTO occurrences (id, reminder_id, snapshot_title, scheduled_at, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
                    arrayOf(occurrenceId, reminderId, snapshotTitle, scheduledAt, now),
                )
                Log.d(TAG, "[AlarmFireReceiver] Wrote occurrence id=$occurrenceId status=pending")
            }
        } catch (e: Exception) {
            Log.e(TAG, "[AlarmFireReceiver] SQLite write error: ${e.message}", e)
        }
    }

    private fun showNotification(
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
        occurrenceId: String,
        scheduledAt: String,
    ) {
        val notifManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GoFlo Reminders",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "GoFlo medication and habit reminders"
                setShowBadge(true)
                enableVibration(true)
            }
            notifManager.createNotificationChannel(channel)
        }

        fun makePendingIntent(action: String): PendingIntent {
            val actionIntent = Intent(context, AlarmActionReceiver::class.java).apply {
                putExtra(AlarmExtras.ACTION, action)
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
                putExtra(AlarmExtras.OCCURRENCE_ID, occurrenceId)
                putExtra(AlarmExtras.SCHEDULED_AT, scheduledAt)
            }
            return PendingIntent.getBroadcast(
                context,
                (reminderId + "_" + action).hashCode(),
                actionIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        val notificationId = reminderId.hashCode()
        val bodyText = if (notes.isNotBlank()) notes else "Time to take action"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(reminderTitle)
            .setContentText(bodyText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bodyText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(false)
            .setOngoing(false)
            .addAction(0, "Take", makePendingIntent("take"))
            .addAction(0, "Snooze", makePendingIntent("snooze"))
            .addAction(0, "Skip", makePendingIntent("skip"))
            .build()

        notifManager.notify(notificationId, notification)
        Log.d(TAG, "[AlarmFireReceiver] Notification shown id=$notificationId for reminderId=$reminderId")
    }
}
