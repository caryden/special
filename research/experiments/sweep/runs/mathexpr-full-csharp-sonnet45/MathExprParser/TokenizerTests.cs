namespace MathExprParser;

using Xunit;

public class TokenizerTests
{
    [Fact]
    public void TestEmptyString()
    {
        var tokens = Tokenizer.Tokenize("");
        Assert.Empty(tokens);
    }

    [Fact]
    public void TestWhitespaceOnly()
    {
        var tokens = Tokenizer.Tokenize("   \t\n  ");
        Assert.Empty(tokens);
    }

    [Fact]
    public void TestSingleNumber()
    {
        var tokens = Tokenizer.Tokenize("42");
        Assert.Single(tokens);
        Assert.Equal(TokenKind.Number, tokens[0].Kind);
        Assert.Equal("42", tokens[0].Value);
    }

    [Fact]
    public void TestDecimalNumber()
    {
        var tokens = Tokenizer.Tokenize("3.14");
        Assert.Single(tokens);
        Assert.Equal(TokenKind.Number, tokens[0].Kind);
        Assert.Equal("3.14", tokens[0].Value);
    }

    [Fact]
    public void TestNumberStartingWithDot()
    {
        var tokens = Tokenizer.Tokenize(".5");
        Assert.Single(tokens);
        Assert.Equal(TokenKind.Number, tokens[0].Kind);
        Assert.Equal(".5", tokens[0].Value);
    }

    [Fact]
    public void TestAllOperators()
    {
        var tokens = Tokenizer.Tokenize("+ - * / % **");
        Assert.Equal(6, tokens.Count);
        Assert.Equal(TokenKind.Plus, tokens[0].Kind);
        Assert.Equal(TokenKind.Minus, tokens[1].Kind);
        Assert.Equal(TokenKind.Star, tokens[2].Kind);
        Assert.Equal(TokenKind.Slash, tokens[3].Kind);
        Assert.Equal(TokenKind.Percent, tokens[4].Kind);
        Assert.Equal(TokenKind.Power, tokens[5].Kind);
        Assert.Equal("**", tokens[5].Value);
    }

    [Fact]
    public void TestParentheses()
    {
        var tokens = Tokenizer.Tokenize("(1)");
        Assert.Equal(3, tokens.Count);
        Assert.Equal(TokenKind.LParen, tokens[0].Kind);
        Assert.Equal(TokenKind.Number, tokens[1].Kind);
        Assert.Equal(TokenKind.RParen, tokens[2].Kind);
    }

    [Fact]
    public void TestComplexExpression()
    {
        var tokens = Tokenizer.Tokenize("2 + 3 * (4 - 1)");
        Assert.Equal(9, tokens.Count);
        Assert.Equal(TokenKind.Number, tokens[0].Kind);
        Assert.Equal("2", tokens[0].Value);
        Assert.Equal(TokenKind.Plus, tokens[1].Kind);
        Assert.Equal(TokenKind.Number, tokens[2].Kind);
        Assert.Equal("3", tokens[2].Value);
        Assert.Equal(TokenKind.Star, tokens[3].Kind);
        Assert.Equal(TokenKind.LParen, tokens[4].Kind);
        Assert.Equal(TokenKind.Number, tokens[5].Kind);
        Assert.Equal("4", tokens[5].Value);
        Assert.Equal(TokenKind.Minus, tokens[6].Kind);
        Assert.Equal(TokenKind.Number, tokens[7].Kind);
        Assert.Equal("1", tokens[7].Value);
        Assert.Equal(TokenKind.RParen, tokens[8].Kind);
    }

    [Fact]
    public void TestPowerOperator()
    {
        var tokens = Tokenizer.Tokenize("2**3*4");
        Assert.Equal(5, tokens.Count);
        Assert.Equal(TokenKind.Number, tokens[0].Kind);
        Assert.Equal(TokenKind.Power, tokens[1].Kind);
        Assert.Equal("**", tokens[1].Value);
        Assert.Equal(TokenKind.Number, tokens[2].Kind);
        Assert.Equal(TokenKind.Star, tokens[3].Kind);
        Assert.Equal(TokenKind.Number, tokens[4].Kind);
    }

    [Fact]
    public void TestNoSpaces()
    {
        var tokens = Tokenizer.Tokenize("1+2");
        Assert.Equal(3, tokens.Count);
        Assert.Equal(TokenKind.Number, tokens[0].Kind);
        Assert.Equal(TokenKind.Plus, tokens[1].Kind);
        Assert.Equal(TokenKind.Number, tokens[2].Kind);
    }

    [Fact]
    public void TestDoubleDotError()
    {
        var ex = Assert.Throws<Exception>(() => Tokenizer.Tokenize("1.2.3"));
        Assert.Contains("Unexpected character '.'", ex.Message);
    }

    [Fact]
    public void TestUnexpectedCharacterError()
    {
        var ex = Assert.Throws<Exception>(() => Tokenizer.Tokenize("2 @ 3"));
        Assert.Contains("Unexpected character '@' at position 2", ex.Message);
    }
}
