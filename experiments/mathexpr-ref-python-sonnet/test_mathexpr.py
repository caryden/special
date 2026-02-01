"""
Comprehensive test suite for mathexpr library.

Translates all test vectors from the TypeScript reference implementation.
"""

import pytest
from mathexpr import (
    # Token types
    token,
    Token,
    # AST types
    number_literal,
    unary_expr,
    binary_expr,
    NumberLiteral,
    UnaryExpr,
    BinaryExpr,
    # Functions
    tokenize,
    parse,
    evaluate,
    calc,
)


# ============================================================================
# Token Types Tests
# ============================================================================

class TestTokenTypes:
    """Tests for token type constructors."""

    def test_token_creates_token_with_kind_and_value(self):
        t = token("number", "42")
        assert t.kind == "number"
        assert t.value == "42"

    def test_token_creates_operator_tokens(self):
        assert token("plus", "+") == Token(kind="plus", value="+")
        assert token("minus", "-") == Token(kind="minus", value="-")
        assert token("star", "*") == Token(kind="star", value="*")
        assert token("slash", "/") == Token(kind="slash", value="/")
        assert token("percent", "%") == Token(kind="percent", value="%")
        assert token("power", "**") == Token(kind="power", value="**")
        assert token("lparen", "(") == Token(kind="lparen", value="(")
        assert token("rparen", ")") == Token(kind="rparen", value=")")


# ============================================================================
# AST Types Tests
# ============================================================================

class TestAstTypes:
    """Tests for AST node constructors."""

    def test_number_literal_creates_number_node(self):
        n = number_literal(42)
        assert n == NumberLiteral(type="number", value=42)

    def test_unary_expr_creates_unary_node(self):
        operand = number_literal(5)
        u = unary_expr("-", operand)
        assert u == UnaryExpr(
            type="unary",
            op="-",
            operand=NumberLiteral(type="number", value=5),
        )

    def test_binary_expr_creates_binary_node(self):
        left = number_literal(2)
        right = number_literal(3)
        b = binary_expr("+", left, right)
        assert b == BinaryExpr(
            type="binary",
            op="+",
            left=NumberLiteral(type="number", value=2),
            right=NumberLiteral(type="number", value=3),
        )

    def test_nested_expressions(self):
        # (2 + 3) * -4
        inner = binary_expr("+", number_literal(2), number_literal(3))
        neg = unary_expr("-", number_literal(4))
        expr = binary_expr("*", inner, neg)
        assert expr.type == "binary"
        assert expr.op == "*"
        assert expr.left == BinaryExpr(
            type="binary",
            op="+",
            left=NumberLiteral(type="number", value=2),
            right=NumberLiteral(type="number", value=3),
        )
        assert expr.right == UnaryExpr(
            type="unary",
            op="-",
            operand=NumberLiteral(type="number", value=4),
        )


# ============================================================================
# Tokenizer Tests
# ============================================================================

class TestTokenizer:
    """Tests for the tokenize function."""

    def test_empty_string(self):
        assert tokenize("") == []

    def test_whitespace_only(self):
        assert tokenize("   \t\n\r  ") == []

    def test_single_integer(self):
        assert tokenize("42") == [Token(kind="number", value="42")]

    def test_decimal_number(self):
        assert tokenize("3.14") == [Token(kind="number", value="3.14")]

    def test_number_starting_with_dot(self):
        assert tokenize(".5") == [Token(kind="number", value=".5")]

    def test_all_operators(self):
        tokens = tokenize("+ - * / % **")
        assert tokens == [
            Token(kind="plus", value="+"),
            Token(kind="minus", value="-"),
            Token(kind="star", value="*"),
            Token(kind="slash", value="/"),
            Token(kind="percent", value="%"),
            Token(kind="power", value="**"),
        ]

    def test_parentheses(self):
        tokens = tokenize("(1)")
        assert tokens == [
            Token(kind="lparen", value="("),
            Token(kind="number", value="1"),
            Token(kind="rparen", value=")"),
        ]

    def test_complex_expression(self):
        tokens = tokenize("2 + 3 * (4 - 1)")
        assert tokens == [
            Token(kind="number", value="2"),
            Token(kind="plus", value="+"),
            Token(kind="number", value="3"),
            Token(kind="star", value="*"),
            Token(kind="lparen", value="("),
            Token(kind="number", value="4"),
            Token(kind="minus", value="-"),
            Token(kind="number", value="1"),
            Token(kind="rparen", value=")"),
        ]

    def test_power_operator_distinguished_from_multiply(self):
        tokens = tokenize("2**3*4")
        assert tokens == [
            Token(kind="number", value="2"),
            Token(kind="power", value="**"),
            Token(kind="number", value="3"),
            Token(kind="star", value="*"),
            Token(kind="number", value="4"),
        ]

    def test_no_whitespace(self):
        tokens = tokenize("1+2")
        assert tokens == [
            Token(kind="number", value="1"),
            Token(kind="plus", value="+"),
            Token(kind="number", value="2"),
        ]

    def test_multiple_decimals_in_one_number_throws(self):
        with pytest.raises(ValueError, match="Unexpected character '.'"):
            tokenize("1.2.3")

    def test_unrecognized_character_throws(self):
        with pytest.raises(ValueError, match="Unexpected character '@'"):
            tokenize("2 @ 3")

    def test_unrecognized_character_reports_position(self):
        with pytest.raises(ValueError, match="position 2"):
            tokenize("2 @ 3")


# ============================================================================
# Parser Tests
# ============================================================================

class TestParser:
    """Tests for the parse function."""

    def p(self, input_str: str):
        """Helper: tokenize then parse."""
        return parse(tokenize(input_str))

    # Atoms
    def test_single_number(self):
        assert self.p("42") == NumberLiteral(type="number", value=42)

    def test_decimal_number(self):
        assert self.p("3.14") == NumberLiteral(type="number", value=3.14)

    def test_parenthesized_number(self):
        assert self.p("(42)") == NumberLiteral(type="number", value=42)

    def test_nested_parentheses(self):
        assert self.p("((7))") == NumberLiteral(type="number", value=7)

    # Binary operations
    def test_addition(self):
        assert self.p("2 + 3") == BinaryExpr(
            type="binary",
            op="+",
            left=NumberLiteral(type="number", value=2),
            right=NumberLiteral(type="number", value=3),
        )

    def test_subtraction(self):
        assert self.p("5 - 1") == BinaryExpr(
            type="binary",
            op="-",
            left=NumberLiteral(type="number", value=5),
            right=NumberLiteral(type="number", value=1),
        )

    def test_multiplication(self):
        assert self.p("4 * 6") == BinaryExpr(
            type="binary",
            op="*",
            left=NumberLiteral(type="number", value=4),
            right=NumberLiteral(type="number", value=6),
        )

    def test_division(self):
        assert self.p("10 / 2") == BinaryExpr(
            type="binary",
            op="/",
            left=NumberLiteral(type="number", value=10),
            right=NumberLiteral(type="number", value=2),
        )

    def test_modulo(self):
        assert self.p("10 % 3") == BinaryExpr(
            type="binary",
            op="%",
            left=NumberLiteral(type="number", value=10),
            right=NumberLiteral(type="number", value=3),
        )

    def test_power(self):
        assert self.p("2 ** 3") == BinaryExpr(
            type="binary",
            op="**",
            left=NumberLiteral(type="number", value=2),
            right=NumberLiteral(type="number", value=3),
        )

    # Precedence
    def test_multiply_before_add(self):
        # 2 + 3 * 4 → 2 + (3 * 4)
        ast = self.p("2 + 3 * 4")
        assert ast == BinaryExpr(
            type="binary",
            op="+",
            left=NumberLiteral(type="number", value=2),
            right=BinaryExpr(
                type="binary",
                op="*",
                left=NumberLiteral(type="number", value=3),
                right=NumberLiteral(type="number", value=4),
            ),
        )

    def test_power_before_multiply(self):
        # 2 * 3 ** 2 → 2 * (3 ** 2)
        ast = self.p("2 * 3 ** 2")
        assert ast == BinaryExpr(
            type="binary",
            op="*",
            left=NumberLiteral(type="number", value=2),
            right=BinaryExpr(
                type="binary",
                op="**",
                left=NumberLiteral(type="number", value=3),
                right=NumberLiteral(type="number", value=2),
            ),
        )

    def test_parens_override_precedence(self):
        # (2 + 3) * 4
        ast = self.p("(2 + 3) * 4")
        assert ast == BinaryExpr(
            type="binary",
            op="*",
            left=BinaryExpr(
                type="binary",
                op="+",
                left=NumberLiteral(type="number", value=2),
                right=NumberLiteral(type="number", value=3),
            ),
            right=NumberLiteral(type="number", value=4),
        )

    # Associativity
    def test_left_associative_add(self):
        # 1 - 2 - 3 → (1 - 2) - 3
        ast = self.p("1 - 2 - 3")
        assert ast == BinaryExpr(
            type="binary",
            op="-",
            left=BinaryExpr(
                type="binary",
                op="-",
                left=NumberLiteral(type="number", value=1),
                right=NumberLiteral(type="number", value=2),
            ),
            right=NumberLiteral(type="number", value=3),
        )

    def test_left_associative_multiply(self):
        # 12 / 3 / 2 → (12 / 3) / 2
        ast = self.p("12 / 3 / 2")
        assert ast == BinaryExpr(
            type="binary",
            op="/",
            left=BinaryExpr(
                type="binary",
                op="/",
                left=NumberLiteral(type="number", value=12),
                right=NumberLiteral(type="number", value=3),
            ),
            right=NumberLiteral(type="number", value=2),
        )

    def test_right_associative_power(self):
        # 2 ** 3 ** 2 → 2 ** (3 ** 2)
        ast = self.p("2 ** 3 ** 2")
        assert ast == BinaryExpr(
            type="binary",
            op="**",
            left=NumberLiteral(type="number", value=2),
            right=BinaryExpr(
                type="binary",
                op="**",
                left=NumberLiteral(type="number", value=3),
                right=NumberLiteral(type="number", value=2),
            ),
        )

    # Unary
    def test_unary_minus(self):
        assert self.p("-5") == UnaryExpr(
            type="unary",
            op="-",
            operand=NumberLiteral(type="number", value=5),
        )

    def test_double_unary_minus(self):
        assert self.p("--5") == UnaryExpr(
            type="unary",
            op="-",
            operand=UnaryExpr(
                type="unary",
                op="-",
                operand=NumberLiteral(type="number", value=5),
            ),
        )

    def test_unary_in_expression(self):
        # 2 * -3
        assert self.p("2 * -3") == BinaryExpr(
            type="binary",
            op="*",
            left=NumberLiteral(type="number", value=2),
            right=UnaryExpr(
                type="unary",
                op="-",
                operand=NumberLiteral(type="number", value=3),
            ),
        )

    # Errors
    def test_empty_token_list(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse([])

    def test_unmatched_left_paren(self):
        with pytest.raises(ValueError, match="Expected rparen"):
            self.p("(2 + 3")

    def test_unmatched_right_paren(self):
        with pytest.raises(ValueError, match="Unexpected token after expression"):
            self.p("2 + 3)")

    def test_unexpected_operator_at_start(self):
        with pytest.raises(ValueError, match="Unexpected token: star"):
            self.p("* 5")

    def test_trailing_operator(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            self.p("2 +")


# ============================================================================
# Evaluator Tests
# ============================================================================

class TestEvaluator:
    """Tests for the evaluate function."""

    def test_number_literal(self):
        assert evaluate(number_literal(42)) == 42

    def test_unary_negation(self):
        assert evaluate(unary_expr("-", number_literal(5))) == -5

    def test_addition(self):
        assert evaluate(binary_expr("+", number_literal(2), number_literal(3))) == 5

    def test_subtraction(self):
        assert evaluate(binary_expr("-", number_literal(10), number_literal(4))) == 6

    def test_multiplication(self):
        assert evaluate(binary_expr("*", number_literal(3), number_literal(7))) == 21

    def test_division(self):
        assert evaluate(binary_expr("/", number_literal(10), number_literal(4))) == 2.5

    def test_modulo(self):
        assert evaluate(binary_expr("%", number_literal(10), number_literal(3))) == 1

    def test_power(self):
        assert evaluate(binary_expr("**", number_literal(2), number_literal(10))) == 1024

    def test_division_by_zero_throws(self):
        with pytest.raises(ValueError, match="Division by zero"):
            evaluate(binary_expr("/", number_literal(1), number_literal(0)))

    def test_modulo_by_zero_throws(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            evaluate(binary_expr("%", number_literal(1), number_literal(0)))

    def test_nested_expression(self):
        # (2 + 3) * -4
        expr = binary_expr(
            "*",
            binary_expr("+", number_literal(2), number_literal(3)),
            unary_expr("-", number_literal(4)),
        )
        assert evaluate(expr) == -20


# ============================================================================
# End-to-End Tests (calc)
# ============================================================================

class TestCalc:
    """End-to-end tests for the calc function."""

    @pytest.mark.parametrize("expr,expected", [
        ("1 + 2", 3),
        ("10 - 3", 7),
        ("4 * 5", 20),
        ("15 / 4", 3.75),
        ("10 % 3", 1),
        ("2 ** 8", 256),
    ])
    def test_basic_arithmetic(self, expr, expected):
        assert calc(expr) == expected

    @pytest.mark.parametrize("expr,expected", [
        ("2 + 3 * 4", 14),
        ("2 * 3 + 4", 10),
        ("10 - 2 * 3", 4),
        ("2 + 3 ** 2", 11),
        ("2 * 3 ** 2", 18),
        ("2 ** 3 * 4", 32),
    ])
    def test_precedence(self, expr, expected):
        assert calc(expr) == expected

    @pytest.mark.parametrize("expr,expected", [
        ("(2 + 3) * 4", 20),
        ("2 * (3 + 4)", 14),
        ("(2 + 3) * (4 + 5)", 45),
        ("((1 + 2) * (3 + 4))", 21),
        ("(10)", 10),
    ])
    def test_parentheses(self, expr, expected):
        assert calc(expr) == expected

    @pytest.mark.parametrize("expr,expected", [
        ("1 - 2 - 3", -4),
        ("1 - 2 + 3", 2),
        ("12 / 3 / 2", 2),
        ("2 ** 3 ** 2", 512),
    ])
    def test_associativity(self, expr, expected):
        assert calc(expr) == expected

    @pytest.mark.parametrize("expr,expected", [
        ("-5", -5),
        ("--5", 5),
        ("-(-5)", 5),
        ("2 * -3", -6),
        ("-2 ** 2", 4),
        ("-(2 ** 2)", -4),
    ])
    def test_unary_minus(self, expr, expected):
        assert calc(expr) == expected

    @pytest.mark.parametrize("expr,expected", [
        ("0.1 + 0.2", 0.1 + 0.2),
        ("3.14 * 2", 6.28),
        (".5 + .5", 1),
    ])
    def test_decimals(self, expr, expected):
        assert calc(expr) == expected

    @pytest.mark.parametrize("expr,expected", [
        ("2 + 3 * 4 - 1", 13),
        ("(2 + 3) * (4 - 1) / 5", 3),
        ("10 % 3 + 2 ** 3", 9),
        ("2 ** (1 + 2)", 8),
        ("100 / 10 / 2 + 3", 8),
    ])
    def test_complex_expressions(self, expr, expected):
        assert calc(expr) == expected

    def test_empty_expression(self):
        with pytest.raises(ValueError, match="Empty expression"):
            calc("")

    def test_whitespace_only(self):
        with pytest.raises(ValueError, match="Empty expression"):
            calc("   ")

    def test_division_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            calc("1 / 0")

    def test_modulo_by_zero(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            calc("5 % 0")

    def test_unmatched_paren(self):
        with pytest.raises(ValueError):
            calc("(2 + 3")

    def test_invalid_character(self):
        with pytest.raises(ValueError):
            calc("2 @ 3")

    def test_trailing_operator(self):
        with pytest.raises(ValueError):
            calc("2 +")
