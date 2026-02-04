package whenwords

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class DurationTest {
    @Test
    fun testNormalMode() {
        assertEquals("0 seconds", duration(0))
        assertEquals("1 second", duration(1))
        assertEquals("45 seconds", duration(45))
        assertEquals("1 minute", duration(60))
        assertEquals("1 minute, 30 seconds", duration(90))
        assertEquals("2 minutes", duration(120))
        assertEquals("1 hour", duration(3600))
        assertEquals("1 hour, 1 minute", duration(3661))
        assertEquals("1 hour, 30 minutes", duration(5400))
        assertEquals("2 hours, 30 minutes", duration(9000))
        assertEquals("1 day", duration(86400))
        assertEquals("1 day, 2 hours", duration(93600))
        assertEquals("7 days", duration(604800))
        assertEquals("1 month", duration(2592000))
        assertEquals("1 year", duration(31536000))
        assertEquals("1 year, 2 months", duration(36720000))
    }

    @Test
    fun testCompactMode() {
        assertEquals("0s", duration(0, DurationOptions(compact = true)))
        assertEquals("45s", duration(45, DurationOptions(compact = true)))
        assertEquals("1h 1m", duration(3661, DurationOptions(compact = true)))
        assertEquals("2h 30m", duration(9000, DurationOptions(compact = true)))
        assertEquals("1d 2h", duration(93600, DurationOptions(compact = true)))
    }

    @Test
    fun testMaxUnits() {
        assertEquals("1 hour", duration(3661, DurationOptions(maxUnits = 1)))
        assertEquals("1 day", duration(93600, DurationOptions(maxUnits = 1)))
        assertEquals("1 day, 2 hours, 1 minute", duration(93661, DurationOptions(maxUnits = 3)))
    }

    @Test
    fun testCompactWithMaxUnits() {
        assertEquals("3h", duration(9000, DurationOptions(compact = true, maxUnits = 1)))
    }

    @Test
    fun testNegativeThrows() {
        assertFailsWith<IllegalArgumentException> {
            duration(-100)
        }
    }
}
