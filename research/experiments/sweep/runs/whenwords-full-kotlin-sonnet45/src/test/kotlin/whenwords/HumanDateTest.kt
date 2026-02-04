package whenwords

import kotlin.test.Test
import kotlin.test.assertEquals

class HumanDateTest {
    private val reference = 1705276800L // 2024-01-15 Monday 00:00 UTC

    @Test
    fun testHumanDate() {
        assertEquals("Today", humanDate(1705276800, reference))
        assertEquals("Today", humanDate(1705320000, reference))
        assertEquals("Yesterday", humanDate(1705190400, reference))
        assertEquals("Tomorrow", humanDate(1705363200, reference))
        assertEquals("Last Saturday", humanDate(1705104000, reference))
        assertEquals("Last Friday", humanDate(1705017600, reference))
        assertEquals("Last Thursday", humanDate(1704931200, reference))
        assertEquals("Last Wednesday", humanDate(1704844800, reference))
        assertEquals("Last Tuesday", humanDate(1704758400, reference))
        assertEquals("January 8", humanDate(1704672000, reference))
        assertEquals("This Wednesday", humanDate(1705449600, reference))
        assertEquals("This Thursday", humanDate(1705536000, reference))
        assertEquals("This Sunday", humanDate(1705795200, reference))
        assertEquals("January 22", humanDate(1705881600, reference))
        assertEquals("March 1", humanDate(1709251200, reference))
        assertEquals("December 31", humanDate(1735603200, reference))
        assertEquals("January 1, 2023", humanDate(1672531200, reference))
        assertEquals("January 6, 2025", humanDate(1736121600, reference))
    }
}
