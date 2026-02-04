package whenwords

import kotlin.math.abs
import kotlin.math.round

/**
 * Converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".
 *
 * @param timestamp Unix epoch seconds (the event time)
 * @param reference Unix epoch seconds (the "now" time to compare against)
 * @return A human-readable relative time string
 */
fun timeAgo(timestamp: Long, reference: Long): String {
    val seconds = abs(reference - timestamp)
    val isFuture = timestamp > reference

    // Threshold table: [maxSeconds, singularLabel, pluralLabel, divisor]
    val thresholds = listOf(
        Threshold(44L, "just now", "just now", 1L),
        Threshold(89L, "1 minute ago", "in 1 minute", 1L),
        Threshold(2640L, "minutes ago", "in N minutes", 60L),
        Threshold(5340L, "1 hour ago", "in 1 hour", 1L),
        Threshold(75600L, "hours ago", "in N hours", 3600L),
        Threshold(126000L, "1 day ago", "in 1 day", 1L),
        Threshold(2160000L, "days ago", "in N days", 86400L),
        Threshold(3888000L, "1 month ago", "in 1 month", 1L),
        Threshold(27561600L, "months ago", "in N months", 2592000L),
        Threshold(47260800L, "1 year ago", "in 1 year", 1L),
        Threshold(Long.MAX_VALUE, "years ago", "in N years", 31536000L)
    )

    for (threshold in thresholds) {
        if (seconds <= threshold.maxSeconds) {
            val pastLabel = threshold.pastLabel
            val futureLabel = threshold.futureLabel

            // "just now" is direction-neutral
            if (pastLabel == "just now") {
                return "just now"
            }

            // Fixed singular labels (divisor = 1)
            if (threshold.divisor == 1L) {
                return if (isFuture) futureLabel else pastLabel
            }

            // Calculate N for plural forms
            val n = round(seconds.toDouble() / threshold.divisor).toLong()

            return if (isFuture) {
                futureLabel.replace("N", n.toString())
            } else {
                if (n == 1L) {
                    when (threshold.divisor) {
                        60L -> "1 minute ago"
                        3600L -> "1 hour ago"
                        86400L -> "1 day ago"
                        2592000L -> "1 month ago"
                        31536000L -> "1 year ago"
                        else -> pastLabel.replace("N", n.toString())
                    }
                } else {
                    "$n ${pastLabel.replace("N ", "")}"
                }
            }
        }
    }

    // Should never reach here
    return if (isFuture) "in many years" else "many years ago"
}

private data class Threshold(
    val maxSeconds: Long,
    val pastLabel: String,
    val futureLabel: String,
    val divisor: Long
)
