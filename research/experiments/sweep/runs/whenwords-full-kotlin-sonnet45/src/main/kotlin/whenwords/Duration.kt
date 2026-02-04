package whenwords

import kotlin.math.round

data class DurationOptions(
    val compact: Boolean = false,
    val maxUnits: Int = 2
)

/**
 * Formats a number of seconds as a human-readable duration string.
 *
 * @param seconds Non-negative integer (throws on negative)
 * @param options Optional formatting options (compact mode, max units)
 * @return A formatted duration string
 * @throws IllegalArgumentException if seconds is negative
 */
fun duration(seconds: Long, options: DurationOptions = DurationOptions()): String {
    if (seconds < 0) {
        throw IllegalArgumentException("Seconds must not be negative")
    }

    if (seconds == 0L) {
        return if (options.compact) "0s" else "0 seconds"
    }

    val units = listOf(
        Unit(31536000, "year", "years", "y"),
        Unit(2592000, "month", "months", "mo"),
        Unit(86400, "day", "days", "d"),
        Unit(3600, "hour", "hours", "h"),
        Unit(60, "minute", "minutes", "m"),
        Unit(1, "second", "seconds", "s")
    )

    val parts = mutableListOf<String>()
    var remaining = seconds

    for (unit in units) {
        if (parts.size >= options.maxUnits) {
            break
        }

        if (remaining >= unit.value) {
            val isLastSlot = parts.size + 1 >= options.maxUnits

            val count = if (isLastSlot) {
                // Round on the last unit (using half-up rounding)
                val division = remaining.toDouble() / unit.value
                val result = if (division - division.toLong() >= 0.5) {
                    division.toLong() + 1
                } else {
                    division.toLong()
                }
                result
            } else {
                // Floor and keep remainder
                remaining / unit.value
            }

            val label = if (options.compact) {
                unit.compact
            } else {
                if (count == 1L) unit.singular else unit.plural
            }

            parts.add(if (options.compact) "$count$label" else "$count $label")

            if (!isLastSlot) {
                remaining %= unit.value
            }
        }
    }

    return if (options.compact) {
        parts.joinToString(" ")
    } else {
        parts.joinToString(", ")
    }
}

private data class Unit(
    val value: Long,
    val singular: String,
    val plural: String,
    val compact: String
)
