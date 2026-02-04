package mathexpr

class Parser(private val tokens: List<Token>) {
    private var pos = 0

    private fun peek(): Token? {
        return if (pos < tokens.size) tokens[pos] else null
    }

    private fun consume(): Token {
        if (pos >= tokens.size) {
            throw IllegalArgumentException("Unexpected end of input")
        }
        return tokens[pos++]
    }

    private fun expect(kind: TokenKind): Token {
        if (pos >= tokens.size) {
            throw IllegalArgumentException("Expected ${kind.name.lowercase()}")
        }
        val token = tokens[pos++]
        if (token.kind != kind) {
            throw IllegalArgumentException("Expected ${kind.name.lowercase()} but got ${token.kind.name.lowercase()}")
        }
        return token
    }

    fun parseExpression(): AstNode {
        val result = parseAddSub()
        if (pos < tokens.size) {
            throw IllegalArgumentException("Unexpected token after expression")
        }
        return result
    }

    private fun parseAddSub(): AstNode {
        var left = parseMulDiv()
        while (true) {
            val token = peek()
            if (token == null || (token.kind != TokenKind.PLUS && token.kind != TokenKind.MINUS)) {
                break
            }
            consume()
            val op = if (token.kind == TokenKind.PLUS) "+" else "-"
            val right = parseMulDiv()
            left = binaryExpr(op, left, right)
        }
        return left
    }

    private fun parseMulDiv(): AstNode {
        var left = parsePower()
        while (true) {
            val token = peek()
            if (token == null || (token.kind != TokenKind.STAR && token.kind != TokenKind.SLASH && token.kind != TokenKind.PERCENT)) {
                break
            }
            consume()
            val op = when (token.kind) {
                TokenKind.STAR -> "*"
                TokenKind.SLASH -> "/"
                TokenKind.PERCENT -> "%"
                else -> throw IllegalStateException("Unexpected token kind")
            }
            val right = parsePower()
            left = binaryExpr(op, left, right)
        }
        return left
    }

    private fun parsePower(): AstNode {
        val left = parseUnary()
        val token = peek()
        if (token != null && token.kind == TokenKind.POWER) {
            consume()
            val right = parsePower() // Right-associative: recurse into same level
            return binaryExpr("**", left, right)
        }
        return left
    }

    private fun parseUnary(): AstNode {
        val token = peek()
        if (token != null && token.kind == TokenKind.MINUS) {
            consume()
            val operand = parseUnary() // Allow chaining: --5
            return unaryExpr("-", operand)
        }
        return parseAtom()
    }

    private fun parseAtom(): AstNode {
        val token = consume()
        when (token.kind) {
            TokenKind.NUMBER -> {
                val value = token.value.toDouble()
                return numberLiteral(value)
            }
            TokenKind.LPAREN -> {
                val expr = parseAddSub()
                expect(TokenKind.RPAREN)
                return expr
            }
            else -> throw IllegalArgumentException("Unexpected token: ${token.kind.name.lowercase()} '${token.value}'")
        }
    }
}

fun parse(tokens: List<Token>): AstNode {
    if (tokens.isEmpty()) {
        throw IllegalArgumentException("Unexpected end of input")
    }
    val parser = Parser(tokens)
    return parser.parseExpression()
}
