package mathexpr

enum class TokenKind {
    NUMBER,
    PLUS,
    MINUS,
    STAR,
    SLASH,
    PERCENT,
    POWER,
    LPAREN,
    RPAREN
}

data class Token(val kind: TokenKind, val value: String)

fun token(kind: TokenKind, value: String): Token {
    return Token(kind, value)
}
