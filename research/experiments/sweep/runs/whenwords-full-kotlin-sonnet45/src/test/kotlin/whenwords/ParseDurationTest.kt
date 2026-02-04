package whenwords

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ParseDurationTest {
    @Test
    fun testCompactFormat() {
        assertEquals(9000, parseDuration("2h30m"))
        assertEquals(9000, parseDuration("2h 30m"))
        assertEquals(9000, parseDuration("2h, 30m"))
        assertEquals(5400, parseDuration("1.5h"))
        assertEquals(5400, parseDuration("90m"))
        assertEquals(5400, parseDuration("90min"))
        assertEquals(45, parseDuration("45s"))
        assertEquals(45, parseDuration("45sec"))
        assertEquals(172800, parseDuration("2d"))
        assertEquals(604800, parseDuration("1w"))
        assertEquals(95400, parseDuration("1d 2h 30m"))
        assertEquals(7200, parseDuration("2hr"))
        assertEquals(7200, parseDuration("2hrs"))
        assertEquals(1800, parseDuration("30mins"))
    }

    @Test
    fun testVerboseFormat() {
        assertEquals(9000, parseDuration("2 hours 30 minutes"))
        assertEquals(9000, parseDuration("2 hours and 30 minutes"))
        assertEquals(9000, parseDuration("2 hours, and 30 minutes"))
        assertEquals(9000, parseDuration("2.5 hours"))
        assertEquals(5400, parseDuration("90 minutes"))
        assertEquals(172800, parseDuration("2 days"))
        assertEquals(604800, parseDuration("1 week"))
        assertEquals(95400, parseDuration("1 day, 2 hours, and 30 minutes"))
        assertEquals(45, parseDuration("45 seconds"))
    }

    @Test
    fun testColonNotation() {
        assertEquals(9000, parseDuration("2:30"))
        assertEquals(5400, parseDuration("1:30:00"))
        assertEquals(330, parseDuration("0:05:30"))
    }

    @Test
    fun testCaseAndWhitespace() {
        assertEquals(9000, parseDuration("2H 30M"))
        assertEquals(9000, parseDuration("  2 hours   30 minutes  "))
    }

    @Test
    fun testErrors() {
        assertFailsWith<IllegalArgumentException> {
            parseDuration("")
        }
        assertFailsWith<IllegalArgumentException> {
            parseDuration("hello world")
        }
        assertFailsWith<IllegalArgumentException> {
            parseDuration("-5 hours")
        }
        assertFailsWith<IllegalArgumentException> {
            parseDuration("42")
        }
        assertFailsWith<IllegalArgumentException> {
            parseDuration("5 foos")
        }
    }
}
