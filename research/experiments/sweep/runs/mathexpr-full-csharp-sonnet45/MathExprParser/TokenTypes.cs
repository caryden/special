namespace MathExprParser;

public enum TokenKind
{
    Number,
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Power,
    LParen,
    RParen
}

public record Token(TokenKind Kind, string Value);

public static class TokenFactory
{
    public static Token CreateToken(TokenKind kind, string value)
    {
        return new Token(kind, value);
    }
}
