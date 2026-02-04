package mathexpr

fun main() {
    try {
        val tokens = listOf(
            Token(TokenKind.LPAREN, "("),
            Token(TokenKind.NUMBER, "2")
        )
        parse(tokens)
    } catch (e: Exception) {
        println("Error message: ${e.message}")
    }
}
