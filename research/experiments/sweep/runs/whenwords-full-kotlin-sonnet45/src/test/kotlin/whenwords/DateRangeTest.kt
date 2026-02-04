package whenwords

import kotlin.test.Test
import kotlin.test.assertEquals

class DateRangeTest {
    @Test
    fun testDateRange() {
        assertEquals("January 15, 2024", dateRange(1705276800, 1705276800))
        assertEquals("January 15, 2024", dateRange(1705276800, 1705320000))
        assertEquals("January 15–16, 2024", dateRange(1705276800, 1705363200))
        assertEquals("January 15–22, 2024", dateRange(1705276800, 1705881600))
        assertEquals("January 15 – February 15, 2024", dateRange(1705276800, 1707955200))
        assertEquals("December 28, 2023 – January 15, 2024", dateRange(1703721600, 1705276800))
        assertEquals("January 1 – December 31, 2024", dateRange(1704067200, 1735603200))
        assertEquals("January 15–22, 2024", dateRange(1705881600, 1705276800))
        assertEquals("January 1, 2023 – January 1, 2025", dateRange(1672531200, 1735689600))
    }
}
