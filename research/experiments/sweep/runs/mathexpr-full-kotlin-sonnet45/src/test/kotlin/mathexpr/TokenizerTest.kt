package mathexpr

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TokenizerTest {
    @Test
    fun `tokenizes empty string`() {
        assertEquals(emptyList(), tokenize(""))
    }

    @Test
    fun `tokenizes whitespace only`() {
        assertEquals(emptyList(), tokenize("   \t\n  "))
    }

    @Test
    fun `tokenizes number`() {
        val tokens = tokenize("42")
        assertEquals(1, tokens.size)
        assertEquals(TokenKind.NUMBER, tokens[0].kind)
        assertEquals("42", tokens[0].value)
    }

    @Test
    fun `tokenizes decimal number`() {
        val tokens = tokenize("3.14")
        assertEquals(1, tokens.size)
        assertEquals(TokenKind.NUMBER, tokens[0].kind)
        assertEquals("3.14", tokens[0].value)
    }

    @Test
    fun `tokenizes number starting with decimal point`() {
        val tokens = tokenize(".5")
        assertEquals(1, tokens.size)
        assertEquals(TokenKind.NUMBER, tokens[0].kind)
        assertEquals(".5", tokens[0].value)
    }

    @Test
    fun `tokenizes all operators`() {
        val tokens = tokenize("+ - * / % **")
        assertEquals(6, tokens.size)
        assertEquals(TokenKind.PLUS, tokens[0].kind)
        assertEquals("+", tokens[0].value)
        assertEquals(TokenKind.MINUS, tokens[1].kind)
        assertEquals("-", tokens[1].value)
        assertEquals(TokenKind.STAR, tokens[2].kind)
        assertEquals("*", tokens[2].value)
        assertEquals(TokenKind.SLASH, tokens[3].kind)
        assertEquals("/", tokens[3].value)
        assertEquals(TokenKind.PERCENT, tokens[4].kind)
        assertEquals("%", tokens[4].value)
        assertEquals(TokenKind.POWER, tokens[5].kind)
        assertEquals("**", tokens[5].value)
    }

    @Test
    fun `tokenizes parentheses`() {
        val tokens = tokenize("(1)")
        assertEquals(3, tokens.size)
        assertEquals(TokenKind.LPAREN, tokens[0].kind)
        assertEquals(TokenKind.NUMBER, tokens[1].kind)
        assertEquals(TokenKind.RPAREN, tokens[2].kind)
    }

    @Test
    fun `tokenizes complex expression`() {
        val tokens = tokenize("2 + 3 * (4 - 1)")
        assertEquals(9, tokens.size)
        assertEquals(TokenKind.NUMBER, tokens[0].kind)
        assertEquals("2", tokens[0].value)
        assertEquals(TokenKind.PLUS, tokens[1].kind)
        assertEquals(TokenKind.NUMBER, tokens[2].kind)
        assertEquals("3", tokens[2].value)
        assertEquals(TokenKind.STAR, tokens[3].kind)
        assertEquals(TokenKind.LPAREN, tokens[4].kind)
        assertEquals(TokenKind.NUMBER, tokens[5].kind)
        assertEquals("4", tokens[5].value)
        assertEquals(TokenKind.MINUS, tokens[6].kind)
        assertEquals(TokenKind.NUMBER, tokens[7].kind)
        assertEquals("1", tokens[7].value)
        assertEquals(TokenKind.RPAREN, tokens[8].kind)
    }

    @Test
    fun `tokenizes power and star correctly`() {
        val tokens = tokenize("2**3*4")
        assertEquals(5, tokens.size)
        assertEquals(TokenKind.NUMBER, tokens[0].kind)
        assertEquals("2", tokens[0].value)
        assertEquals(TokenKind.POWER, tokens[1].kind)
        assertEquals("**", tokens[1].value)
        assertEquals(TokenKind.NUMBER, tokens[2].kind)
        assertEquals("3", tokens[2].value)
        assertEquals(TokenKind.STAR, tokens[3].kind)
        assertEquals("*", tokens[3].value)
        assertEquals(TokenKind.NUMBER, tokens[4].kind)
        assertEquals("4", tokens[4].value)
    }

    @Test
    fun `tokenizes expression without spaces`() {
        val tokens = tokenize("1+2")
        assertEquals(3, tokens.size)
        assertEquals(TokenKind.NUMBER, tokens[0].kind)
        assertEquals("1", tokens[0].value)
        assertEquals(TokenKind.PLUS, tokens[1].kind)
        assertEquals(TokenKind.NUMBER, tokens[2].kind)
        assertEquals("2", tokens[2].value)
    }

    @Test
    fun `throws error on multiple decimal points`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            tokenize("1.2.3")
        }
        assert(ex.message!!.contains("Unexpected character '.'"))
    }

    @Test
    fun `throws error on unexpected character`() {
        val ex = assertFailsWith<IllegalArgumentException> {
            tokenize("2 @ 3")
        }
        assert(ex.message!!.contains("Unexpected character '@'"))
        assert(ex.message!!.contains("position 2"))
    }
}
