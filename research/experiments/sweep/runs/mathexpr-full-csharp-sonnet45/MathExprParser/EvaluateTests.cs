namespace MathExprParser;

using Xunit;

public class EvaluateTests
{
    [Fact]
    public void TestSimpleAddition()
    {
        Assert.Equal(3, MathExpression.Calc("1 + 2"));
    }

    [Fact]
    public void TestSimpleSubtraction()
    {
        Assert.Equal(7, MathExpression.Calc("10 - 3"));
    }

    [Fact]
    public void TestSimpleMultiplication()
    {
        Assert.Equal(20, MathExpression.Calc("4 * 5"));
    }

    [Fact]
    public void TestSimpleDivision()
    {
        Assert.Equal(3.75, MathExpression.Calc("15 / 4"));
    }

    [Fact]
    public void TestSimpleModulo()
    {
        Assert.Equal(1, MathExpression.Calc("10 % 3"));
    }

    [Fact]
    public void TestSimplePower()
    {
        Assert.Equal(256, MathExpression.Calc("2 ** 8"));
    }

    [Fact]
    public void TestPrecedence_AdditionAndMultiplication()
    {
        Assert.Equal(14, MathExpression.Calc("2 + 3 * 4"));
    }

    [Fact]
    public void TestPrecedence_MultiplicationAndAddition()
    {
        Assert.Equal(10, MathExpression.Calc("2 * 3 + 4"));
    }

    [Fact]
    public void TestPrecedence_SubtractionAndMultiplication()
    {
        Assert.Equal(4, MathExpression.Calc("10 - 2 * 3"));
    }

    [Fact]
    public void TestPrecedence_AdditionAndPower()
    {
        Assert.Equal(11, MathExpression.Calc("2 + 3 ** 2"));
    }

    [Fact]
    public void TestPrecedence_MultiplicationAndPower()
    {
        Assert.Equal(18, MathExpression.Calc("2 * 3 ** 2"));
    }

    [Fact]
    public void TestPrecedence_PowerAndMultiplication()
    {
        Assert.Equal(32, MathExpression.Calc("2 ** 3 * 4"));
    }

    [Fact]
    public void TestParentheses_AdditionAndMultiplication()
    {
        Assert.Equal(20, MathExpression.Calc("(2 + 3) * 4"));
    }

    [Fact]
    public void TestParentheses_MultiplicationAndAddition()
    {
        Assert.Equal(14, MathExpression.Calc("2 * (3 + 4)"));
    }

    [Fact]
    public void TestParentheses_Nested()
    {
        Assert.Equal(45, MathExpression.Calc("(2 + 3) * (4 + 5)"));
    }

    [Fact]
    public void TestParentheses_DoubleNested()
    {
        Assert.Equal(21, MathExpression.Calc("((1 + 2) * (3 + 4))"));
    }

    [Fact]
    public void TestParentheses_SingleNumber()
    {
        Assert.Equal(10, MathExpression.Calc("(10)"));
    }

    [Fact]
    public void TestLeftAssociativity_Subtraction()
    {
        Assert.Equal(-4, MathExpression.Calc("1 - 2 - 3"));
    }

    [Fact]
    public void TestLeftAssociativity_SubtractionAndAddition()
    {
        Assert.Equal(2, MathExpression.Calc("1 - 2 + 3"));
    }

    [Fact]
    public void TestLeftAssociativity_Division()
    {
        Assert.Equal(2, MathExpression.Calc("12 / 3 / 2"));
    }

    [Fact]
    public void TestRightAssociativity_Power()
    {
        Assert.Equal(512, MathExpression.Calc("2 ** 3 ** 2"));
    }

    [Fact]
    public void TestUnaryMinus()
    {
        Assert.Equal(-5, MathExpression.Calc("-5"));
    }

    [Fact]
    public void TestDoubleUnaryMinus()
    {
        Assert.Equal(5, MathExpression.Calc("--5"));
    }

    [Fact]
    public void TestUnaryMinusInParentheses()
    {
        Assert.Equal(5, MathExpression.Calc("-(-5)"));
    }

    [Fact]
    public void TestUnaryMinusWithMultiplication()
    {
        Assert.Equal(-6, MathExpression.Calc("2 * -3"));
    }

    [Fact]
    public void TestUnaryMinusAndPower1()
    {
        Assert.Equal(4, MathExpression.Calc("-2 ** 2"));
    }

    [Fact]
    public void TestUnaryMinusAndPower2()
    {
        Assert.Equal(-4, MathExpression.Calc("-(2 ** 2)"));
    }

    [Fact]
    public void TestDecimalNumbers()
    {
        Assert.Equal(6.28, MathExpression.Calc("3.14 * 2"));
    }

    [Fact]
    public void TestDecimalStartingWithDot()
    {
        Assert.Equal(1, MathExpression.Calc(".5 + .5"));
    }

    [Fact]
    public void TestComplexExpression1()
    {
        Assert.Equal(13, MathExpression.Calc("2 + 3 * 4 - 1"));
    }

    [Fact]
    public void TestComplexExpression2()
    {
        Assert.Equal(3, MathExpression.Calc("(2 + 3) * (4 - 1) / 5"));
    }

    [Fact]
    public void TestComplexExpression3()
    {
        Assert.Equal(9, MathExpression.Calc("10 % 3 + 2 ** 3"));
    }

    [Fact]
    public void TestComplexExpression4()
    {
        Assert.Equal(8, MathExpression.Calc("2 ** (1 + 2)"));
    }

    [Fact]
    public void TestComplexExpression5()
    {
        Assert.Equal(8, MathExpression.Calc("100 / 10 / 2 + 3"));
    }

    [Fact]
    public void TestEmptyExpression()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc(""));
        Assert.Contains("Empty expression", ex.Message);
    }

    [Fact]
    public void TestWhitespaceOnlyExpression()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc("   "));
        Assert.Contains("Empty expression", ex.Message);
    }

    [Fact]
    public void TestDivisionByZeroError()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc("1 / 0"));
        Assert.Contains("Division by zero", ex.Message);
    }

    [Fact]
    public void TestModuloByZeroError()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc("5 % 0"));
        Assert.Contains("Modulo by zero", ex.Message);
    }

    [Fact]
    public void TestMissingClosingParenthesis()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc("(2 + 3"));
        Assert.Contains("Expected rparen", ex.Message);
    }

    [Fact]
    public void TestUnexpectedCharacter()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc("2 @ 3"));
        Assert.Contains("Unexpected character", ex.Message);
    }

    [Fact]
    public void TestIncompleteExpression()
    {
        var ex = Assert.Throws<Exception>(() => MathExpression.Calc("2 +"));
        Assert.Contains("Unexpected end of input", ex.Message);
    }
}
