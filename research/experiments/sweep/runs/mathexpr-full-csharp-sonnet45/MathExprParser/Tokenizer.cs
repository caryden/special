namespace MathExprParser;

public static class Tokenizer
{
    public static List<Token> Tokenize(string input)
    {
        var tokens = new List<Token>();
        int i = 0;

        while (i < input.Length)
        {
            char c = input[i];

            // Skip whitespace
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r')
            {
                i++;
                continue;
            }

            // Numbers (digits and decimal point)
            if (char.IsDigit(c) || c == '.')
            {
                int start = i;
                bool hasDot = c == '.';
                i++;

                while (i < input.Length)
                {
                    if (char.IsDigit(input[i]))
                    {
                        i++;
                    }
                    else if (input[i] == '.')
                    {
                        if (hasDot)
                        {
                            throw new Exception($"Unexpected character '{input[i]}' at position {i}");
                        }
                        hasDot = true;
                        i++;
                    }
                    else
                    {
                        break;
                    }
                }

                tokens.Add(new Token(TokenKind.Number, input.Substring(start, i - start)));
                continue;
            }

            // Power operator **
            if (c == '*' && i + 1 < input.Length && input[i + 1] == '*')
            {
                tokens.Add(new Token(TokenKind.Power, "**"));
                i += 2;
                continue;
            }

            // Single-character operators
            switch (c)
            {
                case '+':
                    tokens.Add(new Token(TokenKind.Plus, "+"));
                    i++;
                    break;
                case '-':
                    tokens.Add(new Token(TokenKind.Minus, "-"));
                    i++;
                    break;
                case '*':
                    tokens.Add(new Token(TokenKind.Star, "*"));
                    i++;
                    break;
                case '/':
                    tokens.Add(new Token(TokenKind.Slash, "/"));
                    i++;
                    break;
                case '%':
                    tokens.Add(new Token(TokenKind.Percent, "%"));
                    i++;
                    break;
                case '(':
                    tokens.Add(new Token(TokenKind.LParen, "("));
                    i++;
                    break;
                case ')':
                    tokens.Add(new Token(TokenKind.RParen, ")"));
                    i++;
                    break;
                default:
                    throw new Exception($"Unexpected character '{c}' at position {i}");
            }
        }

        return tokens;
    }
}
