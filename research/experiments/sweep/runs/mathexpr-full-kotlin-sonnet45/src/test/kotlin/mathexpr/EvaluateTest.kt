package mathexpr

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class EvaluateTest {
    @Test
    fun `evaluates simple addition`() {
        assertEquals(3.0, calc("1 + 2"))
    }

    @Test
    fun `evaluates simple subtraction`() {
        assertEquals(7.0, calc("10 - 3"))
    }

    @Test
    fun `evaluates simple multiplication`() {
        assertEquals(20.0, calc("4 * 5"))
    }

    @Test
    fun `evaluates simple division`() {
        assertEquals(3.75, calc("15 / 4"))
    }

    @Test
    fun `evaluates simple modulo`() {
        assertEquals(1.0, calc("10 % 3"))
    }

    @Test
    fun `evaluates simple power`() {
        assertEquals(256.0, calc("2 ** 8"))
    }

    @Test
    fun `evaluates addition and multiplication precedence`() {
        assertEquals(14.0, calc("2 + 3 * 4"))
    }

    @Test
    fun `evaluates multiplication and addition precedence`() {
        assertEquals(10.0, calc("2 * 3 + 4"))
    }

    @Test
    fun `evaluates subtraction and multiplication precedence`() {
        assertEquals(4.0, calc("10 - 2 * 3"))
    }

    @Test
    fun `evaluates addition and power precedence`() {
        assertEquals(11.0, calc("2 + 3 ** 2"))
    }

    @Test
    fun `evaluates multiplication and power precedence`() {
        assertEquals(18.0, calc("2 * 3 ** 2"))
    }

    @Test
    fun `evaluates power and multiplication precedence`() {
        assertEquals(32.0, calc("2 ** 3 * 4"))
    }

    @Test
    fun `evaluates parentheses changing precedence`() {
        assertEquals(20.0, calc("(2 + 3) * 4"))
    }

    @Test
    fun `evaluates parentheses with multiplication`() {
        assertEquals(14.0, calc("2 * (3 + 4)"))
    }

    @Test
    fun `evaluates multiple parentheses groups`() {
        assertEquals(45.0, calc("(2 + 3) * (4 + 5)"))
    }

    @Test
    fun `evaluates nested parentheses`() {
        assertEquals(21.0, calc("((1 + 2) * (3 + 4))"))
    }

    @Test
    fun `evaluates single parenthesized number`() {
        assertEquals(10.0, calc("(10)"))
    }

    @Test
    fun `evaluates left associative subtraction`() {
        assertEquals(-4.0, calc("1 - 2 - 3"))
    }

    @Test
    fun `evaluates left associative mixed addition and subtraction`() {
        assertEquals(2.0, calc("1 - 2 + 3"))
    }

    @Test
    fun `evaluates left associative division`() {
        assertEquals(2.0, calc("12 / 3 / 2"))
    }

    @Test
    fun `evaluates right associative power`() {
        assertEquals(512.0, calc("2 ** 3 ** 2"))
    }

    @Test
    fun `evaluates unary minus`() {
        assertEquals(-5.0, calc("-5"))
    }

    @Test
    fun `evaluates double unary minus`() {
        assertEquals(5.0, calc("--5"))
    }

    @Test
    fun `evaluates parenthesized unary minus`() {
        assertEquals(5.0, calc("-(-5)"))
    }

    @Test
    fun `evaluates multiplication with unary minus`() {
        assertEquals(-6.0, calc("2 * -3"))
    }

    @Test
    fun `evaluates unary minus with power - case 1`() {
        assertEquals(4.0, calc("-2 ** 2"))
    }

    @Test
    fun `evaluates unary minus with power - case 2`() {
        assertEquals(-4.0, calc("-(2 ** 2)"))
    }

    @Test
    fun `evaluates decimal multiplication`() {
        assertEquals(6.28, calc("3.14 * 2"))
    }

    @Test
    fun `evaluates decimal addition`() {
        assertEquals(1.0, calc(".5 + .5"))
    }

    @Test
    fun `evaluates complex expression 1`() {
        assertEquals(13.0, calc("2 + 3 * 4 - 1"))
    }

    @Test
    fun `evaluates complex expression 2`() {
        assertEquals(3.0, calc("(2 + 3) * (4 - 1) / 5"))
    }

    @Test
    fun `evaluates complex expression 3`() {
        assertEquals(9.0, calc("10 % 3 + 2 ** 3"))
    }

    @Test
    fun `evaluates power with parenthesized exponent`() {
        assertEquals(8.0, calc("2 ** (1 + 2)"))
    }

    @Test
    fun `evaluates complex expression 4`() {
        assertEquals(8.0, calc("100 / 10 / 2 + 3"))
    }

    @Test
    fun `throws error on empty string`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            calc("")
        }
        assert(ex.message!!.contains("Empty expression"))
    }

    @Test
    fun `throws error on whitespace only`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            calc("   ")
        }
        assert(ex.message!!.contains("Empty expression"))
    }

    @Test
    fun `throws error on division by zero`() {
        val ex = assertFailsWith<ArithmeticException> {
            calc("1 / 0")
        }
        assert(ex.message!!.contains("Division by zero"))
    }

    @Test
    fun `throws error on modulo by zero`() {
        val ex = assertFailsWith<ArithmeticException> {
            calc("5 % 0")
        }
        assert(ex.message!!.contains("Modulo by zero"))
    }

    @Test
    fun `throws error on missing closing paren`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            calc("(2 + 3")
        }
        assert(ex.message!!.contains("rparen"))
    }

    @Test
    fun `throws error on unexpected character`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            calc("2 @ 3")
        }
        assert(ex.message!!.contains("Unexpected character"))
    }

    @Test
    fun `throws error on incomplete expression`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            calc("2 +")
        }
        assert(ex.message!!.contains("Unexpected end of input"))
    }
}
