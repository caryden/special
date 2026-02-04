package mathexpr

fun calc(expression: String): Double {
    val trimmed = expression.trim()
    if (trimmed.isEmpty()) {
        throw IllegalArgumentException("Empty expression")
    }
    val tokens = tokenize(trimmed)
    val ast = parse(tokens)
    return evaluate(ast)
}
