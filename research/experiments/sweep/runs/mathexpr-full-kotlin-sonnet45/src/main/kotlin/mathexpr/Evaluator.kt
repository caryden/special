package mathexpr

import kotlin.math.pow

fun evaluate(node: AstNode): Double {
    return when (node) {
        is AstNode.NumberLiteral -> node.value
        is AstNode.UnaryExpr -> {
            val operandValue = evaluate(node.operand)
            when (node.op) {
                "-" -> -operandValue
                else -> throw IllegalArgumentException("Unknown unary operator: ${node.op}")
            }
        }
        is AstNode.BinaryExpr -> {
            val leftValue = evaluate(node.left)
            val rightValue = evaluate(node.right)
            when (node.op) {
                "+" -> leftValue + rightValue
                "-" -> leftValue - rightValue
                "*" -> leftValue * rightValue
                "/" -> {
                    if (rightValue == 0.0) {
                        throw ArithmeticException("Division by zero")
                    }
                    leftValue / rightValue
                }
                "%" -> {
                    if (rightValue == 0.0) {
                        throw ArithmeticException("Modulo by zero")
                    }
                    leftValue % rightValue
                }
                "**" -> leftValue.pow(rightValue)
                else -> throw IllegalArgumentException("Unknown binary operator: ${node.op}")
            }
        }
    }
}
