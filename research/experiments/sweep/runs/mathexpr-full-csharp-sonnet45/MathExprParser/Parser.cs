namespace MathExprParser;

public static class Parser
{
    private class ParserState
    {
        public List<Token> Tokens { get; }
        public int Position { get; set; }

        public ParserState(List<Token> tokens)
        {
            Tokens = tokens;
            Position = 0;
        }

        public Token? Peek()
        {
            return Position < Tokens.Count ? Tokens[Position] : null;
        }

        public Token? Consume()
        {
            if (Position >= Tokens.Count) return null;
            return Tokens[Position++];
        }

        public bool IsAtEnd()
        {
            return Position >= Tokens.Count;
        }
    }

    public static AstNode Parse(List<Token> tokens)
    {
        var state = new ParserState(tokens);
        var result = ParseAddSub(state);

        if (!state.IsAtEnd())
        {
            throw new Exception("Unexpected token after expression");
        }

        return result;
    }

    private static AstNode ParseAddSub(ParserState state)
    {
        var left = ParseMulDiv(state);

        while (true)
        {
            var token = state.Peek();
            if (token == null) break;

            if (token.Kind == TokenKind.Plus || token.Kind == TokenKind.Minus)
            {
                state.Consume();
                var right = ParseMulDiv(state);
                left = new BinaryExpr(token.Value, left, right);
            }
            else
            {
                break;
            }
        }

        return left;
    }

    private static AstNode ParseMulDiv(ParserState state)
    {
        var left = ParsePower(state);

        while (true)
        {
            var token = state.Peek();
            if (token == null) break;

            if (token.Kind == TokenKind.Star || token.Kind == TokenKind.Slash || token.Kind == TokenKind.Percent)
            {
                state.Consume();
                var right = ParsePower(state);
                left = new BinaryExpr(token.Value, left, right);
            }
            else
            {
                break;
            }
        }

        return left;
    }

    private static AstNode ParsePower(ParserState state)
    {
        var left = ParseUnary(state);

        var token = state.Peek();
        if (token != null && token.Kind == TokenKind.Power)
        {
            state.Consume();
            var right = ParsePower(state); // Right-associative: recurse into same level
            return new BinaryExpr(token.Value, left, right);
        }

        return left;
    }

    private static AstNode ParseUnary(ParserState state)
    {
        var token = state.Peek();
        if (token != null && token.Kind == TokenKind.Minus)
        {
            state.Consume();
            var operand = ParseUnary(state); // Allow chained unary
            return new UnaryExpr("-", operand);
        }

        return ParseAtom(state);
    }

    private static AstNode ParseAtom(ParserState state)
    {
        var token = state.Consume();

        if (token == null)
        {
            throw new Exception("Unexpected end of input");
        }

        if (token.Kind == TokenKind.Number)
        {
            return new NumberLiteral(double.Parse(token.Value));
        }

        if (token.Kind == TokenKind.LParen)
        {
            var expr = ParseAddSub(state);
            var rparen = state.Consume();

            if (rparen == null || rparen.Kind != TokenKind.RParen)
            {
                throw new Exception("Expected rparen");
            }

            return expr;
        }

        throw new Exception($"Unexpected token: {token.Kind} '{token.Value}'");
    }
}
