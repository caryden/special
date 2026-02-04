package whenwords

import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime
import kotlin.math.round

/**
 * Returns a contextual date string based on proximity to a reference date.
 *
 * @param timestamp Unix epoch seconds (the date to describe)
 * @param reference Unix epoch seconds (the "now" reference point)
 * @return A contextual date label string
 */
fun humanDate(timestamp: Long, reference: Long): String {
    val tsDate = ZonedDateTime.ofInstant(Instant.ofEpochSecond(timestamp), ZoneOffset.UTC)
    val refDate = ZonedDateTime.ofInstant(Instant.ofEpochSecond(reference), ZoneOffset.UTC)

    // Extract components
    val tsYear = tsDate.year
    val tsMonth = tsDate.monthValue
    val tsDay = tsDate.dayOfMonth
    val tsDayOfWeek = tsDate.dayOfWeek.value % 7 // Convert to 0=Sunday, 6=Saturday

    val refYear = refDate.year
    val refMonth = refDate.monthValue
    val refDay = refDate.dayOfMonth

    // Calculate day difference (UTC midnight comparison)
    val tsMidnight = ZonedDateTime.of(tsYear, tsMonth, tsDay, 0, 0, 0, 0, ZoneOffset.UTC)
    val refMidnight = ZonedDateTime.of(refYear, refMonth, refDay, 0, 0, 0, 0, ZoneOffset.UTC)

    val dayDiff = round((tsMidnight.toEpochSecond() - refMidnight.toEpochSecond()).toDouble() / 86400).toInt()

    // Apply rules
    return when (dayDiff) {
        0 -> "Today"
        -1 -> "Yesterday"
        1 -> "Tomorrow"
        in -6..-2 -> "Last ${getDayName(tsDayOfWeek)}"
        in 2..6 -> "This ${getDayName(tsDayOfWeek)}"
        else -> {
            val monthName = getMonthName(tsMonth)
            if (tsYear == refYear) {
                "$monthName $tsDay"
            } else {
                "$monthName $tsDay, $tsYear"
            }
        }
    }
}

private fun getDayName(dayOfWeek: Int): String {
    return when (dayOfWeek) {
        0 -> "Sunday"
        1 -> "Monday"
        2 -> "Tuesday"
        3 -> "Wednesday"
        4 -> "Thursday"
        5 -> "Friday"
        6 -> "Saturday"
        else -> ""
    }
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
