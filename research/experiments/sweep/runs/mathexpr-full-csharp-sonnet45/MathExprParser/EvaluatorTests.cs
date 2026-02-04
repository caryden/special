namespace MathExprParser;

using Xunit;

public class EvaluatorTests
{
    [Fact]
    public void TestNumberLiteral()
    {
        var node = new NumberLiteral(42);
        var result = Evaluator.Evaluate(node);
        Assert.Equal(42, result);
    }

    [Fact]
    public void TestNumberLiteralDecimal()
    {
        var node = new NumberLiteral(3.14);
        var result = Evaluator.Evaluate(node);
        Assert.Equal(3.14, result);
    }

    [Fact]
    public void TestUnaryMinus()
    {
        var node = new UnaryExpr("-", new NumberLiteral(5));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(-5, result);
    }

    [Fact]
    public void TestDoubleUnaryMinus()
    {
        var node = new UnaryExpr("-", new UnaryExpr("-", new NumberLiteral(7)));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(7, result);
    }

    [Fact]
    public void TestAddition()
    {
        var node = new BinaryExpr("+", new NumberLiteral(2), new NumberLiteral(3));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(5, result);
    }

    [Fact]
    public void TestSubtraction()
    {
        var node = new BinaryExpr("-", new NumberLiteral(10), new NumberLiteral(4));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(6, result);
    }

    [Fact]
    public void TestMultiplication()
    {
        var node = new BinaryExpr("*", new NumberLiteral(3), new NumberLiteral(7));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(21, result);
    }

    [Fact]
    public void TestDivision()
    {
        var node = new BinaryExpr("/", new NumberLiteral(15), new NumberLiteral(4));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(3.75, result);
    }

    [Fact]
    public void TestModulo()
    {
        var node = new BinaryExpr("%", new NumberLiteral(10), new NumberLiteral(3));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(1, result);
    }

    [Fact]
    public void TestPower()
    {
        var node = new BinaryExpr("**", new NumberLiteral(2), new NumberLiteral(8));
        var result = Evaluator.Evaluate(node);
        Assert.Equal(256, result);
    }

    [Fact]
    public void TestNestedExpression()
    {
        // 2 + (3 * 4) = 14
        var multiply = new BinaryExpr("*", new NumberLiteral(3), new NumberLiteral(4));
        var node = new BinaryExpr("+", new NumberLiteral(2), multiply);
        var result = Evaluator.Evaluate(node);
        Assert.Equal(14, result);
    }

    [Fact]
    public void TestDivisionByZero()
    {
        var node = new BinaryExpr("/", new NumberLiteral(1), new NumberLiteral(0));
        var ex = Assert.Throws<Exception>(() => Evaluator.Evaluate(node));
        Assert.Contains("Division by zero", ex.Message);
    }

    [Fact]
    public void TestModuloByZero()
    {
        var node = new BinaryExpr("%", new NumberLiteral(5), new NumberLiteral(0));
        var ex = Assert.Throws<Exception>(() => Evaluator.Evaluate(node));
        Assert.Contains("Modulo by zero", ex.Message);
    }
}
