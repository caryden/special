namespace MathExprParser;

public static class MathExpression
{
    public static double Calc(string expression)
    {
        var trimmed = expression.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            throw new Exception("Empty expression");
        }

        var tokens = Tokenizer.Tokenize(trimmed);
        var ast = Parser.Parse(tokens);
        var result = Evaluator.Evaluate(ast);

        return result;
    }
}
