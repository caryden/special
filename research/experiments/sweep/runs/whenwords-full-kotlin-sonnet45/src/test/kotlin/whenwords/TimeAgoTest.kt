package whenwords

import kotlin.test.Test
import kotlin.test.assertEquals

class TimeAgoTest {
    private val reference = 1704067200L // 2024-01-01 00:00:00 UTC

    @Test
    fun testPast() {
        assertEquals("just now", timeAgo(1704067200, reference))
        assertEquals("just now", timeAgo(1704067170, reference))
        assertEquals("just now", timeAgo(1704067156, reference))
        assertEquals("1 minute ago", timeAgo(1704067155, reference))
        assertEquals("1 minute ago", timeAgo(1704067111, reference))
        assertEquals("2 minutes ago", timeAgo(1704067110, reference))
        assertEquals("30 minutes ago", timeAgo(1704065400, reference))
        assertEquals("44 minutes ago", timeAgo(1704064560, reference))
        assertEquals("1 hour ago", timeAgo(1704064500, reference))
        assertEquals("1 hour ago", timeAgo(1704061860, reference))
        assertEquals("2 hours ago", timeAgo(1704061800, reference))
        assertEquals("5 hours ago", timeAgo(1704049200, reference))
        assertEquals("21 hours ago", timeAgo(1703991600, reference))
        assertEquals("1 day ago", timeAgo(1703988000, reference))
        assertEquals("1 day ago", timeAgo(1703941200, reference))
        assertEquals("2 days ago", timeAgo(1703937600, reference))
        assertEquals("7 days ago", timeAgo(1703462400, reference))
        assertEquals("25 days ago", timeAgo(1701907200, reference))
        assertEquals("1 month ago", timeAgo(1701820800, reference))
        assertEquals("1 month ago", timeAgo(1700179200, reference))
        assertEquals("2 months ago", timeAgo(1700092800, reference))
        assertEquals("6 months ago", timeAgo(1688169600, reference))
        assertEquals("11 months ago", timeAgo(1676505600, reference))
        assertEquals("1 year ago", timeAgo(1676419200, reference))
        assertEquals("1 year ago", timeAgo(1656806400, reference))
        assertEquals("2 years ago", timeAgo(1656720000, reference))
        assertEquals("5 years ago", timeAgo(1546300800, reference))
    }

    @Test
    fun testFuture() {
        assertEquals("just now", timeAgo(1704067230, reference))
        assertEquals("in 1 minute", timeAgo(1704067260, reference))
        assertEquals("in 5 minutes", timeAgo(1704067500, reference))
        assertEquals("in 1 hour", timeAgo(1704070200, reference))
        assertEquals("in 3 hours", timeAgo(1704078000, reference))
        assertEquals("in 1 day", timeAgo(1704150000, reference))
        assertEquals("in 2 days", timeAgo(1704240000, reference))
        assertEquals("in 1 month", timeAgo(1706745600, reference))
        assertEquals("in 1 year", timeAgo(1735689600, reference))
    }
}
