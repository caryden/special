package mathexpr

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ParserTest {
    @Test
    fun `parses number literal`() {
        val tokens = listOf(Token(TokenKind.NUMBER, "2"))
        val ast = parse(tokens)
        assertEquals(2.0, (ast as AstNode.NumberLiteral).value)
    }

    @Test
    fun `parses addition`() {
        val tokens = listOf(
            Token(TokenKind.NUMBER, "2"),
            Token(TokenKind.PLUS, "+"),
            Token(TokenKind.NUMBER, "3")
        )
        val ast = parse(tokens) as AstNode.BinaryExpr
        assertEquals("+", ast.op)
        assertEquals(2.0, (ast.left as AstNode.NumberLiteral).value)
        assertEquals(3.0, (ast.right as AstNode.NumberLiteral).value)
    }

    @Test
    fun `parses precedence - addition and multiplication`() {
        val tokens = listOf(
            Token(TokenKind.NUMBER, "2"),
            Token(TokenKind.PLUS, "+"),
            Token(TokenKind.NUMBER, "3"),
            Token(TokenKind.STAR, "*"),
            Token(TokenKind.NUMBER, "4")
        )
        val ast = parse(tokens) as AstNode.BinaryExpr
        assertEquals("+", ast.op)
        assertEquals(2.0, (ast.left as AstNode.NumberLiteral).value)
        val right = ast.right as AstNode.BinaryExpr
        assertEquals("*", right.op)
        assertEquals(3.0, (right.left as AstNode.NumberLiteral).value)
        assertEquals(4.0, (right.right as AstNode.NumberLiteral).value)
    }

    @Test
    fun `parses right-associative power`() {
        val tokens = listOf(
            Token(TokenKind.NUMBER, "2"),
            Token(TokenKind.POWER, "**"),
            Token(TokenKind.NUMBER, "3"),
            Token(TokenKind.POWER, "**"),
            Token(TokenKind.NUMBER, "2")
        )
        val ast = parse(tokens) as AstNode.BinaryExpr
        assertEquals("**", ast.op)
        assertEquals(2.0, (ast.left as AstNode.NumberLiteral).value)
        val right = ast.right as AstNode.BinaryExpr
        assertEquals("**", right.op)
        assertEquals(3.0, (right.left as AstNode.NumberLiteral).value)
        assertEquals(2.0, (right.right as AstNode.NumberLiteral).value)
    }

    @Test
    fun `parses unary minus`() {
        val tokens = listOf(
            Token(TokenKind.MINUS, "-"),
            Token(TokenKind.NUMBER, "5")
        )
        val ast = parse(tokens) as AstNode.UnaryExpr
        assertEquals("-", ast.op)
        assertEquals(5.0, (ast.operand as AstNode.NumberLiteral).value)
    }

    @Test
    fun `parses double unary minus`() {
        val tokens = listOf(
            Token(TokenKind.MINUS, "-"),
            Token(TokenKind.MINUS, "-"),
            Token(TokenKind.NUMBER, "5")
        )
        val ast = parse(tokens) as AstNode.UnaryExpr
        assertEquals("-", ast.op)
        val inner = ast.operand as AstNode.UnaryExpr
        assertEquals("-", inner.op)
        assertEquals(5.0, (inner.operand as AstNode.NumberLiteral).value)
    }

    @Test
    fun `parses parentheses`() {
        val tokens = listOf(
            Token(TokenKind.LPAREN, "("),
            Token(TokenKind.NUMBER, "2"),
            Token(TokenKind.PLUS, "+"),
            Token(TokenKind.NUMBER, "3"),
            Token(TokenKind.RPAREN, ")")
        )
        val ast = parse(tokens) as AstNode.BinaryExpr
        assertEquals("+", ast.op)
        assertEquals(2.0, (ast.left as AstNode.NumberLiteral).value)
        assertEquals(3.0, (ast.right as AstNode.NumberLiteral).value)
    }

    @Test
    fun `throws error on empty input`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            parse(emptyList())
        }
        assert(ex.message!!.contains("Unexpected end of input"))
    }

    @Test
    fun `throws error on incomplete expression`() {
        val tokens = listOf(
            Token(TokenKind.NUMBER, "2"),
            Token(TokenKind.PLUS, "+")
        )
        val ex = assertFailsWith<IllegalArgumentException> {
            parse(tokens)
        }
        assert(ex.message!!.contains("Unexpected end of input"))
    }

    @Test
    fun `throws error on extra tokens`() {
        val tokens = listOf(
            Token(TokenKind.NUMBER, "2"),
            Token(TokenKind.NUMBER, "3")
        )
        val ex = assertFailsWith<IllegalArgumentException> {
            parse(tokens)
        }
        assert(ex.message!!.contains("Unexpected token after expression"))
    }

    @Test
    fun `throws error on missing closing paren`() {
        val tokens = listOf(
            Token(TokenKind.LPAREN, "("),
            Token(TokenKind.NUMBER, "2")
        )
        val ex = assertFailsWith<IllegalArgumentException> {
            parse(tokens)
        }
        assert(ex.message!!.contains("rparen"))
    }
}
