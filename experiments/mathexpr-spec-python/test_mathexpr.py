"""Tests for mathexpr — derived from spec test vectors."""

import pytest
from mathexpr import (
    Token, NumberLiteral, UnaryExpr, BinaryExpr,
    tokenize, parse, evaluate, calc,
)


# ===================================================================
# Tokenizer tests
# ===================================================================

class TestTokenizer:
    def test_empty_string(self):
        assert tokenize("") == []

    def test_whitespace_only(self):
        assert tokenize("   \t\n  ") == []

    def test_integer(self):
        assert tokenize("42") == [Token("number", "42")]

    def test_decimal(self):
        assert tokenize("3.14") == [Token("number", "3.14")]

    def test_leading_dot(self):
        assert tokenize(".5") == [Token("number", ".5")]

    def test_all_operators(self):
        assert tokenize("+ - * / % **") == [
            Token("plus", "+"),
            Token("minus", "-"),
            Token("star", "*"),
            Token("slash", "/"),
            Token("percent", "%"),
            Token("power", "**"),
        ]

    def test_parens(self):
        assert tokenize("(1)") == [
            Token("lparen", "("),
            Token("number", "1"),
            Token("rparen", ")"),
        ]

    def test_full_expression(self):
        assert tokenize("2 + 3 * (4 - 1)") == [
            Token("number", "2"),
            Token("plus", "+"),
            Token("number", "3"),
            Token("star", "*"),
            Token("lparen", "("),
            Token("number", "4"),
            Token("minus", "-"),
            Token("number", "1"),
            Token("rparen", ")"),
        ]

    def test_power_then_star(self):
        assert tokenize("2**3*4") == [
            Token("number", "2"),
            Token("power", "**"),
            Token("number", "3"),
            Token("star", "*"),
            Token("number", "4"),
        ]

    def test_no_spaces(self):
        assert tokenize("1+2") == [
            Token("number", "1"),
            Token("plus", "+"),
            Token("number", "2"),
        ]

    def test_error_double_dot(self):
        with pytest.raises(ValueError, match=r"Unexpected character `.`"):
            tokenize("1.2.3")

    def test_error_invalid_char(self):
        with pytest.raises(ValueError, match=r"Unexpected character `@` at position 2"):
            tokenize("2 @ 3")


# ===================================================================
# Parser tests
# ===================================================================

class TestParser:
    # --- basic atoms ---
    def test_integer(self):
        ast = parse(tokenize("42"))
        assert ast == NumberLiteral("number", 42.0)

    def test_decimal(self):
        ast = parse(tokenize("3.14"))
        assert ast == NumberLiteral("number", 3.14)

    def test_paren_single(self):
        ast = parse(tokenize("(42)"))
        assert ast == NumberLiteral("number", 42.0)

    def test_paren_double(self):
        ast = parse(tokenize("((7))"))
        assert ast == NumberLiteral("number", 7.0)

    # --- binary ops ---
    def test_add(self):
        ast = parse(tokenize("2 + 3"))
        assert ast == BinaryExpr("binary", "+", NumberLiteral("number", 2), NumberLiteral("number", 3))

    def test_sub(self):
        ast = parse(tokenize("5 - 1"))
        assert ast == BinaryExpr("binary", "-", NumberLiteral("number", 5), NumberLiteral("number", 1))

    def test_mul(self):
        ast = parse(tokenize("4 * 6"))
        assert ast == BinaryExpr("binary", "*", NumberLiteral("number", 4), NumberLiteral("number", 6))

    def test_div(self):
        ast = parse(tokenize("10 / 2"))
        assert ast == BinaryExpr("binary", "/", NumberLiteral("number", 10), NumberLiteral("number", 2))

    def test_mod(self):
        ast = parse(tokenize("10 % 3"))
        assert ast == BinaryExpr("binary", "%", NumberLiteral("number", 10), NumberLiteral("number", 3))

    def test_pow(self):
        ast = parse(tokenize("2 ** 3"))
        assert ast == BinaryExpr("binary", "**", NumberLiteral("number", 2), NumberLiteral("number", 3))

    # --- precedence ---
    def test_add_mul_precedence(self):
        ast = parse(tokenize("2 + 3 * 4"))
        assert ast == BinaryExpr("binary", "+",
            NumberLiteral("number", 2),
            BinaryExpr("binary", "*", NumberLiteral("number", 3), NumberLiteral("number", 4)),
        )

    def test_mul_pow_precedence(self):
        ast = parse(tokenize("2 * 3 ** 2"))
        assert ast == BinaryExpr("binary", "*",
            NumberLiteral("number", 2),
            BinaryExpr("binary", "**", NumberLiteral("number", 3), NumberLiteral("number", 2)),
        )

    def test_paren_precedence(self):
        ast = parse(tokenize("(2 + 3) * 4"))
        assert ast == BinaryExpr("binary", "*",
            BinaryExpr("binary", "+", NumberLiteral("number", 2), NumberLiteral("number", 3)),
            NumberLiteral("number", 4),
        )

    # --- associativity ---
    def test_sub_left_assoc(self):
        ast = parse(tokenize("1 - 2 - 3"))
        assert ast == BinaryExpr("binary", "-",
            BinaryExpr("binary", "-", NumberLiteral("number", 1), NumberLiteral("number", 2)),
            NumberLiteral("number", 3),
        )

    def test_div_left_assoc(self):
        ast = parse(tokenize("12 / 3 / 2"))
        assert ast == BinaryExpr("binary", "/",
            BinaryExpr("binary", "/", NumberLiteral("number", 12), NumberLiteral("number", 3)),
            NumberLiteral("number", 2),
        )

    def test_pow_right_assoc(self):
        ast = parse(tokenize("2 ** 3 ** 2"))
        assert ast == BinaryExpr("binary", "**",
            NumberLiteral("number", 2),
            BinaryExpr("binary", "**", NumberLiteral("number", 3), NumberLiteral("number", 2)),
        )

    # --- unary ---
    def test_unary_neg(self):
        ast = parse(tokenize("-5"))
        assert ast == UnaryExpr("unary", "-", NumberLiteral("number", 5))

    def test_unary_double_neg(self):
        ast = parse(tokenize("--5"))
        assert ast == UnaryExpr("unary", "-", UnaryExpr("unary", "-", NumberLiteral("number", 5)))

    def test_unary_in_binary(self):
        ast = parse(tokenize("2 * -3"))
        assert ast == BinaryExpr("binary", "*",
            NumberLiteral("number", 2),
            UnaryExpr("unary", "-", NumberLiteral("number", 3)),
        )

    # --- parser errors ---
    def test_error_empty(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse([])

    def test_error_unmatched_lparen(self):
        with pytest.raises(ValueError, match="Expected rparen"):
            parse(tokenize("(2 + 3"))

    def test_error_trailing_rparen(self):
        with pytest.raises(ValueError, match="Unexpected token after expression"):
            parse(tokenize("2 + 3)"))

    def test_error_leading_star(self):
        with pytest.raises(ValueError, match="Unexpected token: star"):
            parse(tokenize("* 5"))

    def test_error_trailing_op(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse(tokenize("2 +"))


# ===================================================================
# Evaluator tests (direct AST construction)
# ===================================================================

class TestEvaluator:
    def test_number(self):
        assert evaluate(NumberLiteral("number", 42)) == 42

    def test_unary_neg(self):
        assert evaluate(UnaryExpr("unary", "-", NumberLiteral("number", 5))) == -5

    def test_add(self):
        assert evaluate(BinaryExpr("binary", "+", NumberLiteral("number", 2), NumberLiteral("number", 3))) == 5

    def test_sub(self):
        assert evaluate(BinaryExpr("binary", "-", NumberLiteral("number", 10), NumberLiteral("number", 4))) == 6

    def test_mul(self):
        assert evaluate(BinaryExpr("binary", "*", NumberLiteral("number", 3), NumberLiteral("number", 7))) == 21

    def test_div(self):
        assert evaluate(BinaryExpr("binary", "/", NumberLiteral("number", 10), NumberLiteral("number", 4))) == 2.5

    def test_mod(self):
        assert evaluate(BinaryExpr("binary", "%", NumberLiteral("number", 10), NumberLiteral("number", 3))) == 1

    def test_pow(self):
        assert evaluate(BinaryExpr("binary", "**", NumberLiteral("number", 2), NumberLiteral("number", 10))) == 1024

    def test_div_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            evaluate(BinaryExpr("binary", "/", NumberLiteral("number", 1), NumberLiteral("number", 0)))

    def test_mod_by_zero(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            evaluate(BinaryExpr("binary", "%", NumberLiteral("number", 1), NumberLiteral("number", 0)))

    def test_nested(self):
        # (2 + 3) * (-4) = -20
        ast = BinaryExpr("binary", "*",
            BinaryExpr("binary", "+", NumberLiteral("number", 2), NumberLiteral("number", 3)),
            UnaryExpr("unary", "-", NumberLiteral("number", 4)),
        )
        assert evaluate(ast) == -20


# ===================================================================
# End-to-end calc tests
# ===================================================================

class TestCalc:
    @pytest.mark.parametrize("expr, expected", [
        ("1 + 2", 3),
        ("10 - 3", 7),
        ("4 * 5", 20),
        ("15 / 4", 3.75),
        ("10 % 3", 1),
        ("2 ** 8", 256),
        ("2 + 3 * 4", 14),
        ("2 * 3 + 4", 10),
        ("10 - 2 * 3", 4),
        ("2 + 3 ** 2", 11),
        ("2 * 3 ** 2", 18),
        ("2 ** 3 * 4", 32),
        ("(2 + 3) * 4", 20),
        ("2 * (3 + 4)", 14),
        ("(2 + 3) * (4 + 5)", 45),
        ("((1 + 2) * (3 + 4))", 21),
        ("(10)", 10),
        ("1 - 2 - 3", -4),
        ("1 - 2 + 3", 2),
        ("12 / 3 / 2", 2),
        ("2 ** 3 ** 2", 512),
        ("-5", -5),
        ("--5", 5),
        ("-(-5)", 5),
        ("2 * -3", -6),
        ("-2 ** 2", 4),
        ("-(2 ** 2)", -4),
        ("3.14 * 2", 6.28),
        (".5 + .5", 1),
        ("2 + 3 * 4 - 1", 13),
        ("(2 + 3) * (4 - 1) / 5", 3),
        ("10 % 3 + 2 ** 3", 9),
        ("2 ** (1 + 2)", 8),
        ("100 / 10 / 2 + 3", 8),
    ])
    def test_calc(self, expr, expected):
        result = calc(expr)
        assert result == pytest.approx(expected), f"calc({expr!r}) = {result}, expected {expected}"

    def test_error_empty(self):
        with pytest.raises(ValueError, match="Empty expression"):
            calc("")

    def test_error_whitespace(self):
        with pytest.raises(ValueError, match="Empty expression"):
            calc("   ")

    def test_error_div_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            calc("1 / 0")

    def test_error_mod_zero(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            calc("5 % 0")

    def test_error_unmatched_paren(self):
        with pytest.raises(ValueError):
            calc("(2 + 3")

    def test_error_invalid_char(self):
        with pytest.raises(ValueError):
            calc("2 @ 3")

    def test_error_trailing_op(self):
        with pytest.raises(ValueError):
            calc("2 +")
