package whenwords

import kotlin.math.round

/**
 * Parses a human-written duration string into total seconds.
 *
 * @param input A duration string in any supported format
 * @return The total number of seconds (integer, rounded)
 * @throws IllegalArgumentException if input is invalid or empty
 */
fun parseDuration(input: String): Long {
    val trimmed = input.trim()

    if (trimmed.isEmpty()) {
        throw IllegalArgumentException("Duration string cannot be empty")
    }

    if (trimmed.startsWith("-")) {
        throw IllegalArgumentException("Negative durations are not supported")
    }

    // Try colon notation first: h:mm or h:mm:ss
    val colonMatch = Regex("^(\\d+):(\\d{1,2})(?::(\\d{1,2}))?$").matchEntire(trimmed)
    if (colonMatch != null) {
        val hours = colonMatch.groupValues[1].toLong()
        val minutes = colonMatch.groupValues[2].toLong()
        val seconds = colonMatch.groupValues[3].toLongOrNull() ?: 0L
        return hours * 3600 + minutes * 60 + seconds
    }

    // Normalize: lowercase, remove commas and "and", collapse whitespace
    val normalized = trimmed
        .lowercase()
        .replace(",", " ")
        .replace("\\band\\b".toRegex(), " ")
        .replace("\\s+".toRegex(), " ")
        .trim()

    // Match all number+unit pairs
    val unitMap = mapOf(
        "y" to 31536000L, "yr" to 31536000L, "yrs" to 31536000L,
        "year" to 31536000L, "years" to 31536000L,
        "mo" to 2592000L, "month" to 2592000L, "months" to 2592000L,
        "w" to 604800L, "wk" to 604800L, "wks" to 604800L,
        "week" to 604800L, "weeks" to 604800L,
        "d" to 86400L, "day" to 86400L, "days" to 86400L,
        "h" to 3600L, "hr" to 3600L, "hrs" to 3600L,
        "hour" to 3600L, "hours" to 3600L,
        "m" to 60L, "min" to 60L, "mins" to 60L,
        "minute" to 60L, "minutes" to 60L,
        "s" to 1L, "sec" to 1L, "secs" to 1L,
        "second" to 1L, "seconds" to 1L
    )

    val pairRegex = Regex("(\\d+(?:\\.\\d+)?)\\s*([a-z]+)")
    val matches = pairRegex.findAll(normalized)

    var total = 0.0
    var foundAny = false

    for (match in matches) {
        foundAny = true
        val value = match.groupValues[1].toDouble()
        val unit = match.groupValues[2]

        val unitSeconds = unitMap[unit]
            ?: throw IllegalArgumentException("Unrecognized unit: $unit")

        total += value * unitSeconds
    }

    if (!foundAny) {
        throw IllegalArgumentException("No valid duration found in input")
    }

    return round(total).toLong()
}
