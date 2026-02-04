namespace MathExprParser;

using Xunit;

public class ParserTests
{
    [Fact]
    public void TestSingleNumber()
    {
        var tokens = new List<Token> { new Token(TokenKind.Number, "2") };
        var ast = Parser.Parse(tokens);
        Assert.IsType<NumberLiteral>(ast);
        Assert.Equal(2, ((NumberLiteral)ast).Value);
    }

    [Fact]
    public void TestAddition()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Number, "2"),
            new Token(TokenKind.Plus, "+"),
            new Token(TokenKind.Number, "3")
        };
        var ast = Parser.Parse(tokens);
        Assert.IsType<BinaryExpr>(ast);
        var binary = (BinaryExpr)ast;
        Assert.Equal("+", binary.Op);
        Assert.Equal(2, ((NumberLiteral)binary.Left).Value);
        Assert.Equal(3, ((NumberLiteral)binary.Right).Value);
    }

    [Fact]
    public void TestPrecedence_AdditionAndMultiplication()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Number, "2"),
            new Token(TokenKind.Plus, "+"),
            new Token(TokenKind.Number, "3"),
            new Token(TokenKind.Star, "*"),
            new Token(TokenKind.Number, "4")
        };
        var ast = Parser.Parse(tokens);
        Assert.IsType<BinaryExpr>(ast);
        var binary = (BinaryExpr)ast;
        Assert.Equal("+", binary.Op);
        Assert.Equal(2, ((NumberLiteral)binary.Left).Value);
        Assert.IsType<BinaryExpr>(binary.Right);
        var rightBinary = (BinaryExpr)binary.Right;
        Assert.Equal("*", rightBinary.Op);
        Assert.Equal(3, ((NumberLiteral)rightBinary.Left).Value);
        Assert.Equal(4, ((NumberLiteral)rightBinary.Right).Value);
    }

    [Fact]
    public void TestPowerRightAssociative()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Number, "2"),
            new Token(TokenKind.Power, "**"),
            new Token(TokenKind.Number, "3"),
            new Token(TokenKind.Power, "**"),
            new Token(TokenKind.Number, "2")
        };
        var ast = Parser.Parse(tokens);
        Assert.IsType<BinaryExpr>(ast);
        var binary = (BinaryExpr)ast;
        Assert.Equal("**", binary.Op);
        Assert.Equal(2, ((NumberLiteral)binary.Left).Value);
        Assert.IsType<BinaryExpr>(binary.Right);
        var rightBinary = (BinaryExpr)binary.Right;
        Assert.Equal("**", rightBinary.Op);
        Assert.Equal(3, ((NumberLiteral)rightBinary.Left).Value);
        Assert.Equal(2, ((NumberLiteral)rightBinary.Right).Value);
    }

    [Fact]
    public void TestUnaryMinus()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Minus, "-"),
            new Token(TokenKind.Number, "5")
        };
        var ast = Parser.Parse(tokens);
        Assert.IsType<UnaryExpr>(ast);
        var unary = (UnaryExpr)ast;
        Assert.Equal("-", unary.Op);
        Assert.Equal(5, ((NumberLiteral)unary.Operand).Value);
    }

    [Fact]
    public void TestDoubleUnaryMinus()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Minus, "-"),
            new Token(TokenKind.Minus, "-"),
            new Token(TokenKind.Number, "5")
        };
        var ast = Parser.Parse(tokens);
        Assert.IsType<UnaryExpr>(ast);
        var outer = (UnaryExpr)ast;
        Assert.Equal("-", outer.Op);
        Assert.IsType<UnaryExpr>(outer.Operand);
        var inner = (UnaryExpr)outer.Operand;
        Assert.Equal("-", inner.Op);
        Assert.Equal(5, ((NumberLiteral)inner.Operand).Value);
    }

    [Fact]
    public void TestParentheses()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.LParen, "("),
            new Token(TokenKind.Number, "2"),
            new Token(TokenKind.Plus, "+"),
            new Token(TokenKind.Number, "3"),
            new Token(TokenKind.RParen, ")")
        };
        var ast = Parser.Parse(tokens);
        Assert.IsType<BinaryExpr>(ast);
        var binary = (BinaryExpr)ast;
        Assert.Equal("+", binary.Op);
        Assert.Equal(2, ((NumberLiteral)binary.Left).Value);
        Assert.Equal(3, ((NumberLiteral)binary.Right).Value);
    }

    [Fact]
    public void TestEmptyTokensError()
    {
        var tokens = new List<Token>();
        var ex = Assert.Throws<Exception>(() => Parser.Parse(tokens));
        Assert.Contains("Unexpected end of input", ex.Message);
    }

    [Fact]
    public void TestIncompleteExpressionError()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Number, "2"),
            new Token(TokenKind.Plus, "+")
        };
        var ex = Assert.Throws<Exception>(() => Parser.Parse(tokens));
        Assert.Contains("Unexpected end of input", ex.Message);
    }

    [Fact]
    public void TestTrailingTokensError()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.Number, "2"),
            new Token(TokenKind.Number, "3")
        };
        var ex = Assert.Throws<Exception>(() => Parser.Parse(tokens));
        Assert.Contains("Unexpected token after expression", ex.Message);
    }

    [Fact]
    public void TestMissingRParenError()
    {
        var tokens = new List<Token>
        {
            new Token(TokenKind.LParen, "("),
            new Token(TokenKind.Number, "2")
        };
        var ex = Assert.Throws<Exception>(() => Parser.Parse(tokens));
        Assert.Contains("Expected rparen", ex.Message);
    }
}
