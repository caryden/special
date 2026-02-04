package mathexpr

import kotlin.test.Test
import kotlin.test.assertEquals

class TokenTypesTest {
    @Test
    fun `creates number token`() {
        val t = token(TokenKind.NUMBER, "42")
        assertEquals(TokenKind.NUMBER, t.kind)
        assertEquals("42", t.value)
    }

    @Test
    fun `creates plus token`() {
        val t = token(TokenKind.PLUS, "+")
        assertEquals(TokenKind.PLUS, t.kind)
        assertEquals("+", t.value)
    }
}
