namespace MathExprParser;

using Xunit;

public class TokenTypesTests
{
    [Fact]
    public void TestTokenCreation_Number()
    {
        var token = TokenFactory.CreateToken(TokenKind.Number, "42");
        Assert.Equal(TokenKind.Number, token.Kind);
        Assert.Equal("42", token.Value);
    }

    [Fact]
    public void TestTokenCreation_Plus()
    {
        var token = TokenFactory.CreateToken(TokenKind.Plus, "+");
        Assert.Equal(TokenKind.Plus, token.Kind);
        Assert.Equal("+", token.Value);
    }
}
