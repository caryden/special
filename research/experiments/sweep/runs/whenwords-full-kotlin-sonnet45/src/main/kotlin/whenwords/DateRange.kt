package whenwords

import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime

/**
 * Formats two timestamps as a smart date range, collapsing redundant information.
 *
 * @param start Unix epoch seconds (range start)
 * @param end Unix epoch seconds (range end)
 * @return A formatted date range string using en-dash separator
 */
fun dateRange(start: Long, end: Long): String {
    // Auto-swap if needed
    val (s, e) = if (start > end) Pair(end, start) else Pair(start, end)

    val startDate = ZonedDateTime.ofInstant(Instant.ofEpochSecond(s), ZoneOffset.UTC)
    val endDate = ZonedDateTime.ofInstant(Instant.ofEpochSecond(e), ZoneOffset.UTC)

    val startYear = startDate.year
    val startMonth = startDate.monthValue
    val startDay = startDate.dayOfMonth

    val endYear = endDate.year
    val endMonth = endDate.monthValue
    val endDay = endDate.dayOfMonth

    val startMonthName = getMonthName(startMonth)
    val endMonthName = getMonthName(endMonth)

    // Same day
    if (startYear == endYear && startMonth == endMonth && startDay == endDay) {
        return "$startMonthName $startDay, $startYear"
    }

    // Same month & year
    if (startYear == endYear && startMonth == endMonth) {
        return "$startMonthName $startDay\u2013$endDay, $startYear"
    }

    // Same year, different month
    if (startYear == endYear) {
        return "$startMonthName $startDay \u2013 $endMonthName $endDay, $startYear"
    }

    // Different years
    return "$startMonthName $startDay, $startYear \u2013 $endMonthName $endDay, $endYear"
}

private fun getMonthName(month: Int): String {
    return when (month) {
        1 -> "January"
        2 -> "February"
        3 -> "March"
        4 -> "April"
        5 -> "May"
        6 -> "June"
        7 -> "July"
        8 -> "August"
        9 -> "September"
        10 -> "October"
        11 -> "November"
        12 -> "December"
        else -> ""
    }
}
