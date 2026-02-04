namespace MathExprParser;

public static class Evaluator
{
    public static double Evaluate(AstNode node)
    {
        return node switch
        {
            NumberLiteral num => num.Value,
            UnaryExpr unary => EvaluateUnary(unary),
            BinaryExpr binary => EvaluateBinary(binary),
            _ => throw new Exception($"Unknown AST node type: {node.Type}")
        };
    }

    private static double EvaluateUnary(UnaryExpr unary)
    {
        var operandValue = Evaluate(unary.Operand);
        return unary.Op switch
        {
            "-" => -operandValue,
            _ => throw new Exception($"Unknown unary operator: {unary.Op}")
        };
    }

    private static double EvaluateBinary(BinaryExpr binary)
    {
        var leftValue = Evaluate(binary.Left);
        var rightValue = Evaluate(binary.Right);

        return binary.Op switch
        {
            "+" => leftValue + rightValue,
            "-" => leftValue - rightValue,
            "*" => leftValue * rightValue,
            "/" => rightValue == 0 ? throw new Exception("Division by zero") : leftValue / rightValue,
            "%" => rightValue == 0 ? throw new Exception("Modulo by zero") : leftValue % rightValue,
            "**" => Math.Pow(leftValue, rightValue),
            _ => throw new Exception($"Unknown binary operator: {binary.Op}")
        };
    }
}
