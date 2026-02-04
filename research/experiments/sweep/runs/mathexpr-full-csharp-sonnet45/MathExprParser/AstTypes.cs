namespace MathExprParser;

public abstract record AstNode(string Type);

public record NumberLiteral(double Value) : AstNode("number");

public record UnaryExpr(string Op, AstNode Operand) : AstNode("unary");

public record BinaryExpr(string Op, AstNode Left, AstNode Right) : AstNode("binary");

public static class AstFactory
{
    public static NumberLiteral CreateNumberLiteral(double value)
    {
        return new NumberLiteral(value);
    }

    public static UnaryExpr CreateUnaryExpr(string op, AstNode operand)
    {
        return new UnaryExpr(op, operand);
    }

    public static BinaryExpr CreateBinaryExpr(string op, AstNode left, AstNode right)
    {
        return new BinaryExpr(op, left, right);
    }
}
