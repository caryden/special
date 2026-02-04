package mathexpr

import kotlin.test.Test
import kotlin.test.assertEquals

class AstTypesTest {
    @Test
    fun `creates number literal`() {
        val node = numberLiteral(42.0)
        assertEquals(42.0, node.value)
    }

    @Test
    fun `creates unary expression`() {
        val node = unaryExpr("-", numberLiteral(5.0))
        assertEquals("-", node.op)
        assertEquals(5.0, (node.operand as AstNode.NumberLiteral).value)
    }

    @Test
    fun `creates binary expression`() {
        val node = binaryExpr("+", numberLiteral(2.0), numberLiteral(3.0))
        assertEquals("+", node.op)
        assertEquals(2.0, (node.left as AstNode.NumberLiteral).value)
        assertEquals(3.0, (node.right as AstNode.NumberLiteral).value)
    }

    @Test
    fun `creates nested binary expression`() {
        val inner = binaryExpr("+", numberLiteral(1.0), numberLiteral(2.0))
        val outer = binaryExpr("*", inner, numberLiteral(3.0))
        assertEquals("*", outer.op)
        assertEquals("+", (outer.left as AstNode.BinaryExpr).op)
        assertEquals(3.0, (outer.right as AstNode.NumberLiteral).value)
    }
}
