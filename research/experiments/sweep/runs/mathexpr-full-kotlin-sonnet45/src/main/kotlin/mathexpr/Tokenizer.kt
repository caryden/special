package mathexpr

fun tokenize(input: String): List<Token> {
    val tokens = mutableListOf<Token>()
    var i = 0

    while (i < input.length) {
        val ch = input[i]

        // Skip whitespace
        if (ch.isWhitespace()) {
            i++
            continue
        }

        // Numbers (including decimals)
        if (ch.isDigit() || ch == '.') {
            val start = i
            var hasDecimal = ch == '.'
            i++
            while (i < input.length) {
                val c = input[i]
                if (c.isDigit()) {
                    i++
                } else if (c == '.') {
                    if (hasDecimal) {
                        throw IllegalArgumentException("Unexpected character '.' at position $i")
                    }
                    hasDecimal = true
                    i++
                } else {
                    break
                }
            }
            tokens.add(Token(TokenKind.NUMBER, input.substring(start, i)))
            continue
        }

        // Two-character operator: **
        if (ch == '*' && i + 1 < input.length && input[i + 1] == '*') {
            tokens.add(Token(TokenKind.POWER, "**"))
            i += 2
            continue
        }

        // Single-character operators
        when (ch) {
            '+' -> {
                tokens.add(Token(TokenKind.PLUS, "+"))
                i++
            }
            '-' -> {
                tokens.add(Token(TokenKind.MINUS, "-"))
                i++
            }
            '*' -> {
                tokens.add(Token(TokenKind.STAR, "*"))
                i++
            }
            '/' -> {
                tokens.add(Token(TokenKind.SLASH, "/"))
                i++
            }
            '%' -> {
                tokens.add(Token(TokenKind.PERCENT, "%"))
                i++
            }
            '(' -> {
                tokens.add(Token(TokenKind.LPAREN, "("))
                i++
            }
            ')' -> {
                tokens.add(Token(TokenKind.RPAREN, ")"))
                i++
            }
            else -> throw IllegalArgumentException("Unexpected character '$ch' at position $i")
        }
    }

    return tokens
}
