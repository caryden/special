namespace MathExprParser;

using Xunit;

public class AstTypesTests
{
    [Fact]
    public void TestNumberLiteral()
    {
        var node = AstFactory.CreateNumberLiteral(42);
        Assert.Equal("number", node.Type);
        Assert.Equal(42, node.Value);
    }

    [Fact]
    public void TestUnaryExpr()
    {
        var operand = AstFactory.CreateNumberLiteral(5);
        var node = AstFactory.CreateUnaryExpr("-", operand);
        Assert.Equal("unary", node.Type);
        Assert.Equal("-", node.Op);
        Assert.IsType<NumberLiteral>(node.Operand);
        Assert.Equal(5, ((NumberLiteral)node.Operand).Value);
    }

    [Fact]
    public void TestBinaryExpr()
    {
        var left = AstFactory.CreateNumberLiteral(2);
        var right = AstFactory.CreateNumberLiteral(3);
        var node = AstFactory.CreateBinaryExpr("+", left, right);
        Assert.Equal("binary", node.Type);
        Assert.Equal("+", node.Op);
        Assert.Equal(2, ((NumberLiteral)node.Left).Value);
        Assert.Equal(3, ((NumberLiteral)node.Right).Value);
    }

    [Fact]
    public void TestNestedBinaryExpr()
    {
        var one = AstFactory.CreateNumberLiteral(1);
        var two = AstFactory.CreateNumberLiteral(2);
        var three = AstFactory.CreateNumberLiteral(3);
        var inner = AstFactory.CreateBinaryExpr("+", one, two);
        var outer = AstFactory.CreateBinaryExpr("*", inner, three);

        Assert.Equal("binary", outer.Type);
        Assert.Equal("*", outer.Op);
        Assert.IsType<BinaryExpr>(outer.Left);
        Assert.Equal("+", ((BinaryExpr)outer.Left).Op);
    }
}
