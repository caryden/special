package mathexpr

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class EvaluatorTest {
    @Test
    fun `evaluates number literal`() {
        val node = numberLiteral(42.0)
        assertEquals(42.0, evaluate(node))
    }

    @Test
    fun `evaluates decimal number`() {
        val node = numberLiteral(3.14)
        assertEquals(3.14, evaluate(node))
    }

    @Test
    fun `evaluates unary minus`() {
        val node = unaryExpr("-", numberLiteral(5.0))
        assertEquals(-5.0, evaluate(node))
    }

    @Test
    fun `evaluates double unary minus`() {
        val node = unaryExpr("-", unaryExpr("-", numberLiteral(7.0)))
        assertEquals(7.0, evaluate(node))
    }

    @Test
    fun `evaluates addition`() {
        val node = binaryExpr("+", numberLiteral(2.0), numberLiteral(3.0))
        assertEquals(5.0, evaluate(node))
    }

    @Test
    fun `evaluates subtraction`() {
        val node = binaryExpr("-", numberLiteral(10.0), numberLiteral(4.0))
        assertEquals(6.0, evaluate(node))
    }

    @Test
    fun `evaluates multiplication`() {
        val node = binaryExpr("*", numberLiteral(3.0), numberLiteral(7.0))
        assertEquals(21.0, evaluate(node))
    }

    @Test
    fun `evaluates division`() {
        val node = binaryExpr("/", numberLiteral(15.0), numberLiteral(4.0))
        assertEquals(3.75, evaluate(node))
    }

    @Test
    fun `evaluates modulo`() {
        val node = binaryExpr("%", numberLiteral(10.0), numberLiteral(3.0))
        assertEquals(1.0, evaluate(node))
    }

    @Test
    fun `evaluates power`() {
        val node = binaryExpr("**", numberLiteral(2.0), numberLiteral(8.0))
        assertEquals(256.0, evaluate(node))
    }

    @Test
    fun `evaluates nested expression`() {
        val inner = binaryExpr("*", numberLiteral(3.0), numberLiteral(4.0))
        val node = binaryExpr("+", numberLiteral(2.0), inner)
        assertEquals(14.0, evaluate(node))
    }

    @Test
    fun `throws error on division by zero`() {
        val node = binaryExpr("/", numberLiteral(1.0), numberLiteral(0.0))
        val ex = assertFailsWith<ArithmeticException> {
            evaluate(node)
        }
        assert(ex.message!!.contains("Division by zero"))
    }

    @Test
    fun `throws error on modulo by zero`() {
        val node = binaryExpr("%", numberLiteral(5.0), numberLiteral(0.0))
        val ex = assertFailsWith<ArithmeticException> {
            evaluate(node)
        }
        assert(ex.message!!.contains("Modulo by zero"))
    }
}
