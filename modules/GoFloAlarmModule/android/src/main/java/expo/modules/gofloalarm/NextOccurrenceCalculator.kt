package expo.modules.gofloalarm

import java.util.Calendar

/**
 * Kotlin port of client/services/reminderCalculator.ts — interval reminders only (PoC scope).
 * Full implementation (cycle + weekday) follows in Task #35.
 */
internal object NextOccurrenceCalculator {

    /**
     * Port of calculateNextIntervalOccurrence.
     * Returns a Calendar set to the next fire time, or null when the schedule is exhausted.
     */
    fun calculateNextIntervalOccurrence(
        repeatInterval: Int,
        calendarStartDate: String?,
        calendarEndDate: String?,
        calendarEndsType: String,
        maxOccurrences: Int?,
        completedOccurrences: Int,
        reminderTime: String,
    ): Calendar? {
        val (hours, minutes) = parseTime(reminderTime)
        val now = Calendar.getInstance()

        val startDate: Calendar = if (calendarStartDate != null) {
            parseIsoDate(calendarStartDate) ?: Calendar.getInstance()
        } else {
            Calendar.getInstance()
        }
        startDate.set(Calendar.HOUR_OF_DAY, 0)
        startDate.set(Calendar.MINUTE, 0)
        startDate.set(Calendar.SECOND, 0)
        startDate.set(Calendar.MILLISECOND, 0)

        if (calendarEndsType == "on" && calendarEndDate != null) {
            val endDate = parseIsoDate(calendarEndDate) ?: return null
            endDate.set(Calendar.HOUR_OF_DAY, 23)
            endDate.set(Calendar.MINUTE, 59)
            endDate.set(Calendar.SECOND, 59)
            endDate.set(Calendar.MILLISECOND, 999)
            if (now.after(endDate)) return null
        }

        if (calendarEndsType == "after" && maxOccurrences != null && completedOccurrences >= maxOccurrences) {
            return null
        }

        val searchDate: Calendar = if (now.after(startDate)) {
            now.clone() as Calendar
        } else {
            startDate.clone() as Calendar
        }
        searchDate.set(Calendar.HOUR_OF_DAY, 0)
        searchDate.set(Calendar.MINUTE, 0)
        searchDate.set(Calendar.SECOND, 0)
        searchDate.set(Calendar.MILLISECOND, 0)

        val daysSinceStart = daysBetween(startDate, searchDate)
        val daysIntoInterval = (daysSinceStart % repeatInterval).toInt()
        if (daysIntoInterval != 0) {
            searchDate.add(Calendar.DAY_OF_MONTH, repeatInterval - daysIntoInterval)
        }

        val candidate = searchDate.clone() as Calendar
        candidate.set(Calendar.HOUR_OF_DAY, hours)
        candidate.set(Calendar.MINUTE, minutes)
        candidate.set(Calendar.SECOND, 0)
        candidate.set(Calendar.MILLISECOND, 0)

        if (candidate.after(now)) {
            if (isAfterEndDate(candidate, calendarEndDate, calendarEndsType)) return null
            return candidate
        }

        searchDate.add(Calendar.DAY_OF_MONTH, repeatInterval)
        searchDate.set(Calendar.HOUR_OF_DAY, hours)
        searchDate.set(Calendar.MINUTE, minutes)
        searchDate.set(Calendar.SECOND, 0)
        searchDate.set(Calendar.MILLISECOND, 0)

        if (isAfterEndDate(searchDate, calendarEndDate, calendarEndsType)) return null
        return searchDate
    }

    private fun parseTime(hhmm: String): Pair<Int, Int> {
        val parts = hhmm.split(":")
        return Pair(
            parts.getOrNull(0)?.toIntOrNull() ?: 9,
            parts.getOrNull(1)?.toIntOrNull() ?: 0,
        )
    }

    /** Parses "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS.sssZ" into a Calendar. */
    fun parseIsoDate(dateStr: String): Calendar? {
        return try {
            val datePart = dateStr.substringBefore("T").trim()
            val parts = datePart.split("-")
            val cal = Calendar.getInstance()
            cal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), 0, 0, 0)
            cal.set(Calendar.MILLISECOND, 0)
            cal
        } catch (_: Exception) {
            null
        }
    }

    private fun daysBetween(start: Calendar, end: Calendar): Long {
        val diff = end.timeInMillis - start.timeInMillis
        return diff / (24L * 60 * 60 * 1000)
    }

    private fun isAfterEndDate(date: Calendar, endDateStr: String?, calendarEndsType: String): Boolean {
        if (calendarEndsType != "on" || endDateStr == null) return false
        val endDate = parseIsoDate(endDateStr) ?: return false
        endDate.set(Calendar.HOUR_OF_DAY, 23)
        endDate.set(Calendar.MINUTE, 59)
        endDate.set(Calendar.SECOND, 59)
        endDate.set(Calendar.MILLISECOND, 999)
        return date.after(endDate)
    }

    /** Format a Calendar as an ISO-8601 string suitable for SQLite storage. */
    fun calendarToIso(cal: Calendar): String {
        return String.format(
            "%04d-%02d-%02dT%02d:%02d:%02d.000Z",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH),
            cal.get(Calendar.HOUR_OF_DAY),
            cal.get(Calendar.MINUTE),
            cal.get(Calendar.SECOND),
        )
    }
}
