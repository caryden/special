package mathexpr

sealed class AstNode {
    data class NumberLiteral(val value: Double) : AstNode()
    data class UnaryExpr(val op: String, val operand: AstNode) : AstNode()
    data class BinaryExpr(val op: String, val left: AstNode, val right: AstNode) : AstNode()
}

fun numberLiteral(value: Double): AstNode.NumberLiteral {
    return AstNode.NumberLiteral(value)
}

fun unaryExpr(op: String, operand: AstNode): AstNode.UnaryExpr {
    return AstNode.UnaryExpr(op, operand)
}

fun binaryExpr(op: String, left: AstNode, right: AstNode): AstNode.BinaryExpr {
    return AstNode.BinaryExpr(op, left, right)
}
