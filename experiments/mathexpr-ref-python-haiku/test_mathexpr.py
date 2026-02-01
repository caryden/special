"""
Comprehensive test suite for the mathexpr library.

All test vectors are translated from the TypeScript reference implementation:
- token-types.test.ts
- ast-types.test.ts
- tokenizer.test.ts
- parser.test.ts
- evaluator.test.ts
- evaluate.test.ts
"""

import pytest
from mathexpr import (
    # Token types
    token, Token, TokenKind,
    # AST types and constructors
    number_literal, unary_expr, binary_expr,
    NumberLiteral, UnaryExpr, BinaryExpr,
    # Functions
    tokenize, parse, evaluate, calc
)


# ============================================================================
# TOKEN-TYPES TESTS (token-types.test.ts)
# ============================================================================

class TestTokenTypes:
    """Tests for Token and token() function."""

    def test_token_creates_with_kind_and_value(self):
        """token creates a Token with kind and value."""
        t = token("number", "42")
        assert t.kind == TokenKind.NUMBER
        assert t.value == "42"

    def test_token_creates_operator_tokens(self):
        """token creates operator tokens."""
        assert token("plus", "+") == Token(TokenKind.PLUS, "+")
        assert token("minus", "-") == Token(TokenKind.MINUS, "-")
        assert token("star", "*") == Token(TokenKind.STAR, "*")
        assert token("slash", "/") == Token(TokenKind.SLASH, "/")
        assert token("percent", "%") == Token(TokenKind.PERCENT, "%")
        assert token("power", "**") == Token(TokenKind.POWER, "**")
        assert token("lparen", "(") == Token(TokenKind.LPAREN, "(")
        assert token("rparen", ")") == Token(TokenKind.RPAREN, ")")


# ============================================================================
# AST-TYPES TESTS (ast-types.test.ts)
# ============================================================================

class TestAstTypes:
    """Tests for AST node constructors."""

    def test_number_literal_creates_number_node(self):
        """numberLiteral creates a number node."""
        n = number_literal(42)
        assert n == {"type": "number", "value": 42}
        assert n.type == "number"
        assert n.value == 42

    def test_unary_expr_creates_unary_node(self):
        """unaryExpr creates a unary node."""
        operand = number_literal(5)
        u = unary_expr("-", operand)
        assert u == {
            "type": "unary",
            "op": "-",
            "operand": {"type": "number", "value": 5},
        }

    def test_binary_expr_creates_binary_node(self):
        """binaryExpr creates a binary node."""
        left = number_literal(2)
        right = number_literal(3)
        b = binary_expr("+", left, right)
        assert b == {
            "type": "binary",
            "op": "+",
            "left": {"type": "number", "value": 2},
            "right": {"type": "number", "value": 3},
        }

    def test_nested_expressions(self):
        """Test nested expressions (2 + 3) * -4."""
        inner = binary_expr("+", number_literal(2), number_literal(3))
        neg = unary_expr("-", number_literal(4))
        expr = binary_expr("*", inner, neg)
        
        assert expr.type == "binary"
        assert expr.op == "*"
        assert expr.left == {
            "type": "binary",
            "op": "+",
            "left": {"type": "number", "value": 2},
            "right": {"type": "number", "value": 3},
        }
        assert expr.right == {
            "type": "unary",
            "op": "-",
            "operand": {"type": "number", "value": 4},
        }


# ============================================================================
# TOKENIZER TESTS (tokenizer.test.ts)
# ============================================================================

class TestTokenizer:
    """Tests for tokenize() function."""

    def test_empty_string(self):
        """Empty string tokenizes to empty list."""
        assert tokenize("") == []

    def test_whitespace_only(self):
        """Whitespace-only string tokenizes to empty list."""
        assert tokenize("   \t\n\r  ") == []

    def test_single_integer(self):
        """Single integer tokenizes correctly."""
        assert tokenize("42") == [token("number", "42")]

    def test_decimal_number(self):
        """Decimal number tokenizes correctly."""
        assert tokenize("3.14") == [token("number", "3.14")]

    def test_number_starting_with_dot(self):
        """Number starting with dot tokenizes correctly."""
        assert tokenize(".5") == [token("number", ".5")]

    def test_all_operators(self):
        """All operators tokenize correctly."""
        tokens = tokenize("+ - * / % **")
        assert tokens == [
            token("plus", "+"),
            token("minus", "-"),
            token("star", "*"),
            token("slash", "/"),
            token("percent", "%"),
            token("power", "**"),
        ]

    def test_parentheses(self):
        """Parentheses tokenize correctly."""
        tokens = tokenize("(1)")
        assert tokens == [
            token("lparen", "("),
            token("number", "1"),
            token("rparen", ")"),
        ]

    def test_complex_expression(self):
        """Complex expression tokenizes correctly."""
        tokens = tokenize("2 + 3 * (4 - 1)")
        assert tokens == [
            token("number", "2"),
            token("plus", "+"),
            token("number", "3"),
            token("star", "*"),
            token("lparen", "("),
            token("number", "4"),
            token("minus", "-"),
            token("number", "1"),
            token("rparen", ")"),
        ]

    def test_power_operator_distinguished_from_multiply(self):
        """Power operator (**) is distinguished from multiply (*)."""
        tokens = tokenize("2**3*4")
        assert tokens == [
            token("number", "2"),
            token("power", "**"),
            token("number", "3"),
            token("star", "*"),
            token("number", "4"),
        ]

    def test_no_whitespace(self):
        """Expression without whitespace tokenizes correctly."""
        tokens = tokenize("1+2")
        assert tokens == [
            token("number", "1"),
            token("plus", "+"),
            token("number", "2"),
        ]

    def test_multiple_decimals_in_one_number_throws(self):
        """Multiple decimals in one number throws error."""
        with pytest.raises(ValueError, match="Unexpected character '.'"):
            tokenize("1.2.3")

    def test_unrecognized_character_throws(self):
        """Unrecognized character throws error."""
        with pytest.raises(ValueError, match="Unexpected character '@'"):
            tokenize("2 @ 3")

    def test_unrecognized_character_reports_position(self):
        """Unrecognized character error reports position."""
        with pytest.raises(ValueError, match="position 2"):
            tokenize("2 @ 3")


# ============================================================================
# PARSER TESTS (parser.test.ts)
# ============================================================================

class TestParser:
    """Tests for parse() function."""

    def p(self, input_str: str):
        """Helper: tokenize then parse."""
        return parse(tokenize(input_str))

    # Atoms
    class TestAtoms:
        """Tests for atomic expressions."""

        def test_single_number(self, p=None):
            """Single number parses correctly."""
            if p is None:
                p = TestParser().p
            assert p("42") == {"type": "number", "value": 42.0}

        def test_decimal_number(self, p=None):
            """Decimal number parses correctly."""
            if p is None:
                p = TestParser().p
            assert p("3.14") == {"type": "number", "value": 3.14}

        def test_parenthesized_number(self, p=None):
            """Parenthesized number parses correctly."""
            if p is None:
                p = TestParser().p
            assert p("(42)") == {"type": "number", "value": 42.0}

        def test_nested_parentheses(self, p=None):
            """Nested parentheses parse correctly."""
            if p is None:
                p = TestParser().p
            assert p("((7))") == {"type": "number", "value": 7.0}

    def test_single_number(self):
        """Single number parses correctly."""
        assert self.p("42") == {"type": "number", "value": 42.0}

    def test_decimal_number(self):
        """Decimal number parses correctly."""
        assert self.p("3.14") == {"type": "number", "value": 3.14}

    def test_parenthesized_number(self):
        """Parenthesized number parses correctly."""
        assert self.p("(42)") == {"type": "number", "value": 42.0}

    def test_nested_parentheses(self):
        """Nested parentheses parse correctly."""
        assert self.p("((7))") == {"type": "number", "value": 7.0}

    # Binary operations
    def test_addition(self):
        """Addition parses correctly."""
        assert self.p("2 + 3") == {
            "type": "binary",
            "op": "+",
            "left": {"type": "number", "value": 2.0},
            "right": {"type": "number", "value": 3.0},
        }

    def test_subtraction(self):
        """Subtraction parses correctly."""
        assert self.p("5 - 1") == {
            "type": "binary",
            "op": "-",
            "left": {"type": "number", "value": 5.0},
            "right": {"type": "number", "value": 1.0},
        }

    def test_multiplication(self):
        """Multiplication parses correctly."""
        assert self.p("4 * 6") == {
            "type": "binary",
            "op": "*",
            "left": {"type": "number", "value": 4.0},
            "right": {"type": "number", "value": 6.0},
        }

    def test_division(self):
        """Division parses correctly."""
        assert self.p("10 / 2") == {
            "type": "binary",
            "op": "/",
            "left": {"type": "number", "value": 10.0},
            "right": {"type": "number", "value": 2.0},
        }

    def test_modulo(self):
        """Modulo parses correctly."""
        assert self.p("10 % 3") == {
            "type": "binary",
            "op": "%",
            "left": {"type": "number", "value": 10.0},
            "right": {"type": "number", "value": 3.0},
        }

    def test_power(self):
        """Power parses correctly."""
        assert self.p("2 ** 3") == {
            "type": "binary",
            "op": "**",
            "left": {"type": "number", "value": 2.0},
            "right": {"type": "number", "value": 3.0},
        }

    # Precedence
    def test_multiply_before_add(self):
        """Multiply has higher precedence than add: 2 + 3 * 4 → 2 + (3 * 4)."""
        ast = self.p("2 + 3 * 4")
        assert ast == {
            "type": "binary",
            "op": "+",
            "left": {"type": "number", "value": 2.0},
            "right": {
                "type": "binary",
                "op": "*",
                "left": {"type": "number", "value": 3.0},
                "right": {"type": "number", "value": 4.0},
            },
        }

    def test_power_before_multiply(self):
        """Power has higher precedence than multiply: 2 * 3 ** 2 → 2 * (3 ** 2)."""
        ast = self.p("2 * 3 ** 2")
        assert ast == {
            "type": "binary",
            "op": "*",
            "left": {"type": "number", "value": 2.0},
            "right": {
                "type": "binary",
                "op": "**",
                "left": {"type": "number", "value": 3.0},
                "right": {"type": "number", "value": 2.0},
            },
        }

    def test_parens_override_precedence(self):
        """Parentheses override precedence: (2 + 3) * 4."""
        ast = self.p("(2 + 3) * 4")
        assert ast == {
            "type": "binary",
            "op": "*",
            "left": {
                "type": "binary",
                "op": "+",
                "left": {"type": "number", "value": 2.0},
                "right": {"type": "number", "value": 3.0},
            },
            "right": {"type": "number", "value": 4.0},
        }

    # Associativity
    def test_left_associative_subtract(self):
        """Subtraction is left-associative: 1 - 2 - 3 → (1 - 2) - 3."""
        ast = self.p("1 - 2 - 3")
        assert ast == {
            "type": "binary",
            "op": "-",
            "left": {
                "type": "binary",
                "op": "-",
                "left": {"type": "number", "value": 1.0},
                "right": {"type": "number", "value": 2.0},
            },
            "right": {"type": "number", "value": 3.0},
        }

    def test_left_associative_divide(self):
        """Division is left-associative: 12 / 3 / 2 → (12 / 3) / 2."""
        ast = self.p("12 / 3 / 2")
        assert ast == {
            "type": "binary",
            "op": "/",
            "left": {
                "type": "binary",
                "op": "/",
                "left": {"type": "number", "value": 12.0},
                "right": {"type": "number", "value": 3.0},
            },
            "right": {"type": "number", "value": 2.0},
        }

    def test_right_associative_power(self):
        """Power is right-associative: 2 ** 3 ** 2 → 2 ** (3 ** 2)."""
        ast = self.p("2 ** 3 ** 2")
        assert ast == {
            "type": "binary",
            "op": "**",
            "left": {"type": "number", "value": 2.0},
            "right": {
                "type": "binary",
                "op": "**",
                "left": {"type": "number", "value": 3.0},
                "right": {"type": "number", "value": 2.0},
            },
        }

    # Unary
    def test_unary_minus(self):
        """Unary minus parses correctly."""
        assert self.p("-5") == {
            "type": "unary",
            "op": "-",
            "operand": {"type": "number", "value": 5.0},
        }

    def test_double_unary_minus(self):
        """Double unary minus parses correctly."""
        assert self.p("--5") == {
            "type": "unary",
            "op": "-",
            "operand": {
                "type": "unary",
                "op": "-",
                "operand": {"type": "number", "value": 5.0},
            },
        }

    def test_unary_in_expression(self):
        """Unary in expression: 2 * -3."""
        assert self.p("2 * -3") == {
            "type": "binary",
            "op": "*",
            "left": {"type": "number", "value": 2.0},
            "right": {
                "type": "unary",
                "op": "-",
                "operand": {"type": "number", "value": 3.0},
            },
        }

    # Errors
    def test_empty_token_list(self):
        """Empty token list raises error."""
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse([])

    def test_unmatched_left_paren(self):
        """Unmatched left paren raises error."""
        with pytest.raises(ValueError, match="Expected rparen"):
            self.p("(2 + 3")

    def test_unmatched_right_paren(self):
        """Unmatched right paren raises error."""
        with pytest.raises(ValueError, match="Unexpected token after expression"):
            self.p("2 + 3)")

    def test_unexpected_operator_at_start(self):
        """Unexpected operator at start raises error."""
        with pytest.raises(ValueError, match="Unexpected token: star"):
            self.p("* 5")

    def test_trailing_operator(self):
        """Trailing operator raises error."""
        with pytest.raises(ValueError, match="Unexpected end of input"):
            self.p("2 +")


# ============================================================================
# EVALUATOR TESTS (evaluator.test.ts)
# ============================================================================

class TestEvaluator:
    """Tests for evaluate() function."""

    def test_number_literal(self):
        """Number literal evaluates correctly."""
        assert evaluate(number_literal(42)) == 42

    def test_unary_negation(self):
        """Unary negation evaluates correctly."""
        assert evaluate(unary_expr("-", number_literal(5))) == -5

    def test_addition(self):
        """Addition evaluates correctly."""
        assert evaluate(binary_expr("+", number_literal(2), number_literal(3))) == 5

    def test_subtraction(self):
        """Subtraction evaluates correctly."""
        assert evaluate(binary_expr("-", number_literal(10), number_literal(4))) == 6

    def test_multiplication(self):
        """Multiplication evaluates correctly."""
        assert evaluate(binary_expr("*", number_literal(3), number_literal(7))) == 21

    def test_division(self):
        """Division evaluates correctly."""
        assert evaluate(binary_expr("/", number_literal(10), number_literal(4))) == 2.5

    def test_modulo(self):
        """Modulo evaluates correctly."""
        assert evaluate(binary_expr("%", number_literal(10), number_literal(3))) == 1

    def test_power(self):
        """Power evaluates correctly."""
        assert evaluate(binary_expr("**", number_literal(2), number_literal(10))) == 1024

    def test_division_by_zero_throws(self):
        """Division by zero raises error."""
        with pytest.raises(ValueError, match="Division by zero"):
            evaluate(binary_expr("/", number_literal(1), number_literal(0)))

    def test_modulo_by_zero_throws(self):
        """Modulo by zero raises error."""
        with pytest.raises(ValueError, match="Modulo by zero"):
            evaluate(binary_expr("%", number_literal(1), number_literal(0)))

    def test_nested_expression(self):
        """Nested expression (2 + 3) * -4 evaluates correctly."""
        expr = binary_expr(
            "*",
            binary_expr("+", number_literal(2), number_literal(3)),
            unary_expr("-", number_literal(4)),
        )
        assert evaluate(expr) == -20


# ============================================================================
# CALC TESTS (evaluate.test.ts - end-to-end)
# ============================================================================

class TestCalc:
    """Tests for calc() function (end-to-end)."""

    # Basic arithmetic
    @pytest.mark.parametrize("expr,expected", [
        ("1 + 2", 3),
        ("10 - 3", 7),
        ("4 * 5", 20),
        ("15 / 4", 3.75),
        ("10 % 3", 1),
        ("2 ** 8", 256),
    ])
    def test_basic_arithmetic(self, expr, expected):
        """Basic arithmetic expressions."""
        assert calc(expr) == expected

    # Precedence
    @pytest.mark.parametrize("expr,expected", [
        ("2 + 3 * 4", 14),
        ("2 * 3 + 4", 10),
        ("10 - 2 * 3", 4),
        ("2 + 3 ** 2", 11),
        ("2 * 3 ** 2", 18),
        ("2 ** 3 * 4", 32),
    ])
    def test_precedence(self, expr, expected):
        """Precedence is correct."""
        assert calc(expr) == expected

    # Parentheses
    @pytest.mark.parametrize("expr,expected", [
        ("(2 + 3) * 4", 20),
        ("2 * (3 + 4)", 14),
        ("(2 + 3) * (4 + 5)", 45),
        ("((1 + 2) * (3 + 4))", 21),
        ("(10)", 10),
    ])
    def test_parentheses(self, expr, expected):
        """Parentheses work correctly."""
        assert calc(expr) == expected

    # Associativity
    @pytest.mark.parametrize("expr,expected", [
        ("1 - 2 - 3", -4),
        ("1 - 2 + 3", 2),
        ("12 / 3 / 2", 2),
        ("2 ** 3 ** 2", 512),
    ])
    def test_associativity(self, expr, expected):
        """Associativity is correct."""
        assert calc(expr) == expected

    # Unary minus
    @pytest.mark.parametrize("expr,expected", [
        ("-5", -5),
        ("--5", 5),
        ("-(-5)", 5),
        ("2 * -3", -6),
        ("-2 ** 2", 4),
        ("-(2 ** 2)", -4),
    ])
    def test_unary_minus(self, expr, expected):
        """Unary minus works correctly."""
        assert calc(expr) == expected

    # Decimals
    @pytest.mark.parametrize("expr,expected", [
        ("0.1 + 0.2", 0.1 + 0.2),
        ("3.14 * 2", 6.28),
        (".5 + .5", 1),
    ])
    def test_decimals(self, expr, expected):
        """Decimal numbers work correctly."""
        assert calc(expr) == expected

    # Complex expressions
    @pytest.mark.parametrize("expr,expected", [
        ("2 + 3 * 4 - 1", 13),
        ("(2 + 3) * (4 - 1) / 5", 3),
        ("10 % 3 + 2 ** 3", 9),
        ("2 ** (1 + 2)", 8),
        ("100 / 10 / 2 + 3", 8),
    ])
    def test_complex_expressions(self, expr, expected):
        """Complex expressions evaluate correctly."""
        assert calc(expr) == expected

    # Errors
    def test_empty_expression(self):
        """Empty expression raises error."""
        with pytest.raises(ValueError, match="Empty expression"):
            calc("")

    def test_whitespace_only(self):
        """Whitespace-only expression raises error."""
        with pytest.raises(ValueError, match="Empty expression"):
            calc("   ")

    def test_division_by_zero(self):
        """Division by zero raises error."""
        with pytest.raises(ValueError, match="Division by zero"):
            calc("1 / 0")

    def test_modulo_by_zero(self):
        """Modulo by zero raises error."""
        with pytest.raises(ValueError, match="Modulo by zero"):
            calc("5 % 0")

    def test_unmatched_paren(self):
        """Unmatched paren raises error."""
        with pytest.raises(ValueError):
            calc("(2 + 3")

    def test_invalid_character(self):
        """Invalid character raises error."""
        with pytest.raises(ValueError):
            calc("2 @ 3")

    def test_trailing_operator(self):
        """Trailing operator raises error."""
        with pytest.raises(ValueError):
            calc("2 +")
