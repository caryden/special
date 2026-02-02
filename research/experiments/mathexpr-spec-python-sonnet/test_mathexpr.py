"""Tests for mathexpr module using exact test vectors from SPEC.md."""

import pytest
from mathexpr import (
    Token, NumberLiteral, UnaryExpr, BinaryExpr,
    tokenize, parse, evaluate, calc
)


# ============================================================================
# Tokenizer Tests
# ============================================================================

def test_tokenize_empty():
    assert tokenize("") == []

def test_tokenize_whitespace_only():
    assert tokenize("   \t\n  ") == []

def test_tokenize_number():
    assert tokenize("42") == [Token("number", "42")]

def test_tokenize_decimal():
    assert tokenize("3.14") == [Token("number", "3.14")]

def test_tokenize_decimal_no_leading_digit():
    assert tokenize(".5") == [Token("number", ".5")]

def test_tokenize_operators():
    result = tokenize("+ - * / % **")
    expected = [
        Token("plus", "+"),
        Token("minus", "-"),
        Token("star", "*"),
        Token("slash", "/"),
        Token("percent", "%"),
        Token("power", "**")
    ]
    assert result == expected

def test_tokenize_parens():
    result = tokenize("(1)")
    expected = [
        Token("lparen", "("),
        Token("number", "1"),
        Token("rparen", ")")
    ]
    assert result == expected

def test_tokenize_complex_expression():
    result = tokenize("2 + 3 * (4 - 1)")
    expected = [
        Token("number", "2"),
        Token("plus", "+"),
        Token("number", "3"),
        Token("star", "*"),
        Token("lparen", "("),
        Token("number", "4"),
        Token("minus", "-"),
        Token("number", "1"),
        Token("rparen", ")")
    ]
    assert result == expected

def test_tokenize_power_precedence():
    result = tokenize("2**3*4")
    expected = [
        Token("number", "2"),
        Token("power", "**"),
        Token("number", "3"),
        Token("star", "*"),
        Token("number", "4")
    ]
    assert result == expected

def test_tokenize_no_spaces():
    result = tokenize("1+2")
    expected = [
        Token("number", "1"),
        Token("plus", "+"),
        Token("number", "2")
    ]
    assert result == expected

def test_tokenize_error_double_decimal():
    with pytest.raises(ValueError, match="Unexpected character"):
        tokenize("1.2.3")

def test_tokenize_error_invalid_char():
    with pytest.raises(ValueError, match="Unexpected character @ at position 2"):
        tokenize("2 @ 3")


# ============================================================================
# Parser Tests
# ============================================================================

def test_parse_number():
    tokens = [Token("number", "42")]
    ast = parse(tokens)
    assert ast == NumberLiteral(42)

def test_parse_decimal():
    tokens = [Token("number", "3.14")]
    ast = parse(tokens)
    assert ast == NumberLiteral(3.14)

def test_parse_parens_single():
    tokens = [Token("lparen", "("), Token("number", "42"), Token("rparen", ")")]
    ast = parse(tokens)
    assert ast == NumberLiteral(42)

def test_parse_parens_nested():
    tokens = [
        Token("lparen", "("),
        Token("lparen", "("),
        Token("number", "7"),
        Token("rparen", ")"),
        Token("rparen", ")")
    ]
    ast = parse(tokens)
    assert ast == NumberLiteral(7)

def test_parse_addition():
    tokens = [Token("number", "2"), Token("plus", "+"), Token("number", "3")]
    ast = parse(tokens)
    assert ast == BinaryExpr("+", NumberLiteral(2), NumberLiteral(3))

def test_parse_subtraction():
    tokens = [Token("number", "5"), Token("minus", "-"), Token("number", "1")]
    ast = parse(tokens)
    assert ast == BinaryExpr("-", NumberLiteral(5), NumberLiteral(1))

def test_parse_multiplication():
    tokens = [Token("number", "4"), Token("star", "*"), Token("number", "6")]
    ast = parse(tokens)
    assert ast == BinaryExpr("*", NumberLiteral(4), NumberLiteral(6))

def test_parse_division():
    tokens = [Token("number", "10"), Token("slash", "/"), Token("number", "2")]
    ast = parse(tokens)
    assert ast == BinaryExpr("/", NumberLiteral(10), NumberLiteral(2))

def test_parse_modulo():
    tokens = [Token("number", "10"), Token("percent", "%"), Token("number", "3")]
    ast = parse(tokens)
    assert ast == BinaryExpr("%", NumberLiteral(10), NumberLiteral(3))

def test_parse_power():
    tokens = [Token("number", "2"), Token("power", "**"), Token("number", "3")]
    ast = parse(tokens)
    assert ast == BinaryExpr("**", NumberLiteral(2), NumberLiteral(3))

# Precedence tests
def test_parse_precedence_add_mul():
    # 2 + 3 * 4 => 2 + (3 * 4)
    tokens = [
        Token("number", "2"),
        Token("plus", "+"),
        Token("number", "3"),
        Token("star", "*"),
        Token("number", "4")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("+", NumberLiteral(2), BinaryExpr("*", NumberLiteral(3), NumberLiteral(4)))
    assert ast == expected

def test_parse_precedence_mul_power():
    # 2 * 3 ** 2 => 2 * (3 ** 2)
    tokens = [
        Token("number", "2"),
        Token("star", "*"),
        Token("number", "3"),
        Token("power", "**"),
        Token("number", "2")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("*", NumberLiteral(2), BinaryExpr("**", NumberLiteral(3), NumberLiteral(2)))
    assert ast == expected

def test_parse_precedence_parens_override():
    # (2 + 3) * 4
    tokens = [
        Token("lparen", "("),
        Token("number", "2"),
        Token("plus", "+"),
        Token("number", "3"),
        Token("rparen", ")"),
        Token("star", "*"),
        Token("number", "4")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("*", BinaryExpr("+", NumberLiteral(2), NumberLiteral(3)), NumberLiteral(4))
    assert ast == expected

# Associativity tests
def test_parse_associativity_left_sub():
    # 1 - 2 - 3 => (1 - 2) - 3
    tokens = [
        Token("number", "1"),
        Token("minus", "-"),
        Token("number", "2"),
        Token("minus", "-"),
        Token("number", "3")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("-", BinaryExpr("-", NumberLiteral(1), NumberLiteral(2)), NumberLiteral(3))
    assert ast == expected

def test_parse_associativity_left_div():
    # 12 / 3 / 2 => (12 / 3) / 2
    tokens = [
        Token("number", "12"),
        Token("slash", "/"),
        Token("number", "3"),
        Token("slash", "/"),
        Token("number", "2")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("/", BinaryExpr("/", NumberLiteral(12), NumberLiteral(3)), NumberLiteral(2))
    assert ast == expected

def test_parse_associativity_right_power():
    # 2 ** 3 ** 2 => 2 ** (3 ** 2)
    tokens = [
        Token("number", "2"),
        Token("power", "**"),
        Token("number", "3"),
        Token("power", "**"),
        Token("number", "2")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("**", NumberLiteral(2), BinaryExpr("**", NumberLiteral(3), NumberLiteral(2)))
    assert ast == expected

# Unary tests
def test_parse_unary_minus():
    # -5
    tokens = [Token("minus", "-"), Token("number", "5")]
    ast = parse(tokens)
    assert ast == UnaryExpr("-", NumberLiteral(5))

def test_parse_unary_double_minus():
    # --5
    tokens = [Token("minus", "-"), Token("minus", "-"), Token("number", "5")]
    ast = parse(tokens)
    expected = UnaryExpr("-", UnaryExpr("-", NumberLiteral(5)))
    assert ast == expected

def test_parse_unary_in_expression():
    # 2 * -3
    tokens = [
        Token("number", "2"),
        Token("star", "*"),
        Token("minus", "-"),
        Token("number", "3")
    ]
    ast = parse(tokens)
    expected = BinaryExpr("*", NumberLiteral(2), UnaryExpr("-", NumberLiteral(3)))
    assert ast == expected

# Parser errors
def test_parse_error_empty():
    with pytest.raises(ValueError, match="Unexpected end of input"):
        parse([])

def test_parse_error_unmatched_lparen():
    tokens = [
        Token("lparen", "("),
        Token("number", "2"),
        Token("plus", "+"),
        Token("number", "3")
    ]
    with pytest.raises(ValueError, match="Expected rparen"):
        parse(tokens)

def test_parse_error_unmatched_rparen():
    tokens = [
        Token("number", "2"),
        Token("plus", "+"),
        Token("number", "3"),
        Token("rparen", ")")
    ]
    with pytest.raises(ValueError, match="Unexpected token after expression"):
        parse(tokens)

def test_parse_error_unexpected_star():
    tokens = [Token("star", "*"), Token("number", "5")]
    with pytest.raises(ValueError, match="Unexpected token: star"):
        parse(tokens)

def test_parse_error_incomplete_expression():
    tokens = [Token("number", "2"), Token("plus", "+")]
    with pytest.raises(ValueError, match="Unexpected end of input"):
        parse(tokens)


# ============================================================================
# Evaluator Tests
# ============================================================================

def test_evaluate_number():
    ast = NumberLiteral(42)
    assert evaluate(ast) == 42

def test_evaluate_unary():
    ast = UnaryExpr("-", NumberLiteral(5))
    assert evaluate(ast) == -5

def test_evaluate_binary_add():
    ast = BinaryExpr("+", NumberLiteral(2), NumberLiteral(3))
    assert evaluate(ast) == 5

def test_evaluate_binary_sub():
    ast = BinaryExpr("-", NumberLiteral(10), NumberLiteral(4))
    assert evaluate(ast) == 6

def test_evaluate_binary_mul():
    ast = BinaryExpr("*", NumberLiteral(3), NumberLiteral(7))
    assert evaluate(ast) == 21

def test_evaluate_binary_div():
    ast = BinaryExpr("/", NumberLiteral(10), NumberLiteral(4))
    assert evaluate(ast) == 2.5

def test_evaluate_binary_mod():
    ast = BinaryExpr("%", NumberLiteral(10), NumberLiteral(3))
    assert evaluate(ast) == 1

def test_evaluate_binary_power():
    ast = BinaryExpr("**", NumberLiteral(2), NumberLiteral(10))
    assert evaluate(ast) == 1024

def test_evaluate_error_div_zero():
    ast = BinaryExpr("/", NumberLiteral(1), NumberLiteral(0))
    with pytest.raises(ValueError, match="Division by zero"):
        evaluate(ast)

def test_evaluate_error_mod_zero():
    ast = BinaryExpr("%", NumberLiteral(1), NumberLiteral(0))
    with pytest.raises(ValueError, match="Modulo by zero"):
        evaluate(ast)

def test_evaluate_nested():
    # (2 + 3) * (-4) = 5 * (-4) = -20
    ast = BinaryExpr(
        "*",
        BinaryExpr("+", NumberLiteral(2), NumberLiteral(3)),
        UnaryExpr("-", NumberLiteral(4))
    )
    assert evaluate(ast) == -20


# ============================================================================
# End-to-End Tests (calc)
# ============================================================================

def test_calc_add():
    assert calc("1 + 2") == 3

def test_calc_sub():
    assert calc("10 - 3") == 7

def test_calc_mul():
    assert calc("4 * 5") == 20

def test_calc_div():
    assert calc("15 / 4") == 3.75

def test_calc_mod():
    assert calc("10 % 3") == 1

def test_calc_power():
    assert calc("2 ** 8") == 256

def test_calc_precedence_add_mul():
    assert calc("2 + 3 * 4") == 14

def test_calc_precedence_mul_add():
    assert calc("2 * 3 + 4") == 10

def test_calc_precedence_sub_mul():
    assert calc("10 - 2 * 3") == 4

def test_calc_precedence_add_power():
    assert calc("2 + 3 ** 2") == 11

def test_calc_precedence_mul_power():
    assert calc("2 * 3 ** 2") == 18

def test_calc_precedence_power_mul():
    assert calc("2 ** 3 * 4") == 32

def test_calc_parens_add_mul():
    assert calc("(2 + 3) * 4") == 20

def test_calc_parens_mul_add():
    assert calc("2 * (3 + 4)") == 14

def test_calc_parens_both():
    assert calc("(2 + 3) * (4 + 5)") == 45

def test_calc_parens_nested():
    assert calc("((1 + 2) * (3 + 4))") == 21

def test_calc_parens_simple():
    assert calc("(10)") == 10

def test_calc_assoc_left_sub():
    assert calc("1 - 2 - 3") == -4

def test_calc_assoc_mixed_add_sub():
    assert calc("1 - 2 + 3") == 2

def test_calc_assoc_left_div():
    assert calc("12 / 3 / 2") == 2

def test_calc_assoc_right_power():
    assert calc("2 ** 3 ** 2") == 512

def test_calc_unary_minus():
    assert calc("-5") == -5

def test_calc_unary_double_minus():
    assert calc("--5") == 5

def test_calc_unary_parens():
    assert calc("-(-5)") == 5

def test_calc_unary_in_mul():
    assert calc("2 * -3") == -6

def test_calc_unary_power_precedence_1():
    # -2 ** 2: unary minus has LOWER precedence than **, so this is -(2**2) = -4
    # Wait, let me check the spec... The spec says unary - is precedence 4, and ** is precedence 3
    # Higher number = higher precedence, so unary - (4) > ** (3)
    # So -2 ** 2 should be parsed as (-2) ** 2 = 4
    assert calc("-2 ** 2") == 4

def test_calc_unary_power_precedence_2():
    assert calc("-(2 ** 2)") == -4

def test_calc_decimal():
    assert calc("3.14 * 2") == 6.28

def test_calc_decimal_add():
    assert calc(".5 + .5") == 1

def test_calc_complex_1():
    assert calc("2 + 3 * 4 - 1") == 13

def test_calc_complex_2():
    assert calc("(2 + 3) * (4 - 1) / 5") == 3

def test_calc_complex_3():
    assert calc("10 % 3 + 2 ** 3") == 9

def test_calc_complex_4():
    assert calc("2 ** (1 + 2)") == 8

def test_calc_complex_5():
    assert calc("100 / 10 / 2 + 3") == 8

# End-to-end errors
def test_calc_error_empty():
    with pytest.raises(ValueError, match="Empty expression"):
        calc("")

def test_calc_error_whitespace():
    with pytest.raises(ValueError, match="Empty expression"):
        calc("   ")

def test_calc_error_div_zero():
    with pytest.raises(ValueError, match="Division by zero"):
        calc("1 / 0")

def test_calc_error_mod_zero():
    with pytest.raises(ValueError, match="Modulo by zero"):
        calc("5 % 0")

def test_calc_error_unmatched_paren():
    with pytest.raises(ValueError):
        calc("(2 + 3")

def test_calc_error_invalid_char():
    with pytest.raises(ValueError):
        calc("2 @ 3")

def test_calc_error_incomplete():
    with pytest.raises(ValueError):
        calc("2 +")
