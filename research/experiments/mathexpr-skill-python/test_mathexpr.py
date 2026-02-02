"""Comprehensive tests for mathexpr — covers all test vectors from the specs."""

import pytest

from mathexpr import (
    Token,
    NumberLiteral,
    UnaryExpr,
    BinaryExpr,
    tokenize,
    parse,
    evaluate,
    calc,
)


# ===================================================================
# token-types tests
# ===================================================================

class TestTokenTypes:
    def test_number_token(self):
        t = Token("number", "42")
        assert t.kind == "number"
        assert t.value == "42"

    def test_plus_token(self):
        t = Token("plus", "+")
        assert t.kind == "plus"
        assert t.value == "+"


# ===================================================================
# ast-types tests
# ===================================================================

class TestAstTypes:
    def test_number_literal(self):
        n = NumberLiteral(42)
        assert n.type == "number"
        assert n.value == 42

    def test_unary_expr(self):
        u = UnaryExpr("-", NumberLiteral(5))
        assert u.type == "unary"
        assert u.op == "-"
        assert isinstance(u.operand, NumberLiteral)
        assert u.operand.value == 5

    def test_binary_expr(self):
        b = BinaryExpr("+", NumberLiteral(2), NumberLiteral(3))
        assert b.type == "binary"
        assert b.op == "+"
        assert b.left.value == 2
        assert b.right.value == 3

    def test_nested_binary(self):
        inner = BinaryExpr("+", NumberLiteral(1), NumberLiteral(2))
        outer = BinaryExpr("*", inner, NumberLiteral(3))
        assert outer.op == "*"
        assert outer.left.op == "+"
        assert outer.right.value == 3


# ===================================================================
# tokenizer tests
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
        result = tokenize("+ - * / % **")
        assert result == [
            Token("plus", "+"),
            Token("minus", "-"),
            Token("star", "*"),
            Token("slash", "/"),
            Token("percent", "%"),
            Token("power", "**"),
        ]

    def test_parenthesized_number(self):
        assert tokenize("(1)") == [
            Token("lparen", "("),
            Token("number", "1"),
            Token("rparen", ")"),
        ]

    def test_expression(self):
        result = tokenize("2 + 3 * (4 - 1)")
        assert result == [
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

    def test_power_and_star(self):
        result = tokenize("2**3*4")
        assert result == [
            Token("number", "2"),
            Token("power", "**"),
            Token("number", "3"),
            Token("star", "*"),
            Token("number", "4"),
        ]

    def test_no_spaces(self):
        result = tokenize("1+2")
        assert result == [
            Token("number", "1"),
            Token("plus", "+"),
            Token("number", "2"),
        ]

    def test_double_dot_error(self):
        with pytest.raises(ValueError, match=r"Unexpected character '\.'"):
            tokenize("1.2.3")

    def test_unknown_char_error(self):
        with pytest.raises(ValueError, match=r"Unexpected character '@' at position 2"):
            tokenize("2 @ 3")


# ===================================================================
# parser tests
# ===================================================================

class TestParser:
    def test_single_number(self):
        tokens = [Token("number", "2")]
        ast = parse(tokens)
        assert isinstance(ast, NumberLiteral)
        assert ast.value == 2

    def test_addition(self):
        tokens = [Token("number", "2"), Token("plus", "+"), Token("number", "3")]
        ast = parse(tokens)
        assert isinstance(ast, BinaryExpr)
        assert ast.op == "+"
        assert ast.left.value == 2
        assert ast.right.value == 3

    def test_precedence_add_mul(self):
        # 2 + 3 * 4 -> Binary(+, 2, Binary(*, 3, 4))
        tokens = [
            Token("number", "2"), Token("plus", "+"),
            Token("number", "3"), Token("star", "*"), Token("number", "4"),
        ]
        ast = parse(tokens)
        assert ast.op == "+"
        assert ast.left.value == 2
        assert ast.right.op == "*"

    def test_right_assoc_power(self):
        # 2 ** 3 ** 2 -> Binary(**, 2, Binary(**, 3, 2))
        tokens = [
            Token("number", "2"), Token("power", "**"),
            Token("number", "3"), Token("power", "**"), Token("number", "2"),
        ]
        ast = parse(tokens)
        assert ast.op == "**"
        assert ast.left.value == 2
        assert ast.right.op == "**"
        assert ast.right.left.value == 3
        assert ast.right.right.value == 2

    def test_unary_minus(self):
        tokens = [Token("minus", "-"), Token("number", "5")]
        ast = parse(tokens)
        assert isinstance(ast, UnaryExpr)
        assert ast.op == "-"
        assert ast.operand.value == 5

    def test_double_unary_minus(self):
        tokens = [Token("minus", "-"), Token("minus", "-"), Token("number", "5")]
        ast = parse(tokens)
        assert isinstance(ast, UnaryExpr)
        assert isinstance(ast.operand, UnaryExpr)
        assert ast.operand.operand.value == 5

    def test_parenthesized(self):
        tokens = [
            Token("lparen", "("), Token("number", "2"),
            Token("plus", "+"), Token("number", "3"),
            Token("rparen", ")"),
        ]
        ast = parse(tokens)
        assert isinstance(ast, BinaryExpr)
        assert ast.op == "+"

    def test_empty_tokens_error(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse([])

    def test_trailing_operator_error(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse([Token("number", "2"), Token("plus", "+")])

    def test_trailing_tokens_error(self):
        with pytest.raises(ValueError, match="Unexpected token after expression"):
            parse([Token("number", "2"), Token("number", "3")])

    def test_missing_rparen_error(self):
        with pytest.raises(ValueError, match="Expected rparen"):
            parse([Token("lparen", "("), Token("number", "2")])


# ===================================================================
# evaluator tests
# ===================================================================

class TestEvaluator:
    def test_number(self):
        assert evaluate(NumberLiteral(42)) == 42

    def test_decimal(self):
        assert evaluate(NumberLiteral(3.14)) == 3.14

    def test_unary_minus(self):
        assert evaluate(UnaryExpr("-", NumberLiteral(5))) == -5

    def test_double_unary(self):
        assert evaluate(UnaryExpr("-", UnaryExpr("-", NumberLiteral(7)))) == 7

    def test_addition(self):
        assert evaluate(BinaryExpr("+", NumberLiteral(2), NumberLiteral(3))) == 5

    def test_subtraction(self):
        assert evaluate(BinaryExpr("-", NumberLiteral(10), NumberLiteral(4))) == 6

    def test_multiplication(self):
        assert evaluate(BinaryExpr("*", NumberLiteral(3), NumberLiteral(7))) == 21

    def test_division(self):
        assert evaluate(BinaryExpr("/", NumberLiteral(15), NumberLiteral(4))) == 3.75

    def test_modulo(self):
        assert evaluate(BinaryExpr("%", NumberLiteral(10), NumberLiteral(3))) == 1

    def test_power(self):
        assert evaluate(BinaryExpr("**", NumberLiteral(2), NumberLiteral(8))) == 256

    def test_nested(self):
        # 2 + 3 * 4 = 14
        ast = BinaryExpr("+", NumberLiteral(2),
                         BinaryExpr("*", NumberLiteral(3), NumberLiteral(4)))
        assert evaluate(ast) == 14

    def test_division_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            evaluate(BinaryExpr("/", NumberLiteral(1), NumberLiteral(0)))

    def test_modulo_by_zero(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            evaluate(BinaryExpr("%", NumberLiteral(5), NumberLiteral(0)))


# ===================================================================
# calc (end-to-end) tests
# ===================================================================

class TestCalc:
    # --- Basic operations ---
    def test_addition(self):
        assert calc("1 + 2") == 3

    def test_subtraction(self):
        assert calc("10 - 3") == 7

    def test_multiplication(self):
        assert calc("4 * 5") == 20

    def test_division(self):
        assert calc("15 / 4") == 3.75

    def test_modulo(self):
        assert calc("10 % 3") == 1

    def test_power(self):
        assert calc("2 ** 8") == 256

    # --- Precedence ---
    def test_add_mul_precedence(self):
        assert calc("2 + 3 * 4") == 14

    def test_mul_add_precedence(self):
        assert calc("2 * 3 + 4") == 10

    def test_sub_mul_precedence(self):
        assert calc("10 - 2 * 3") == 4

    def test_add_power_precedence(self):
        assert calc("2 + 3 ** 2") == 11

    def test_mul_power_precedence(self):
        assert calc("2 * 3 ** 2") == 18

    def test_power_mul_precedence(self):
        assert calc("2 ** 3 * 4") == 32

    # --- Parentheses ---
    def test_parens_add_mul(self):
        assert calc("(2 + 3) * 4") == 20

    def test_mul_parens(self):
        assert calc("2 * (3 + 4)") == 14

    def test_two_parens(self):
        assert calc("(2 + 3) * (4 + 5)") == 45

    def test_nested_parens(self):
        assert calc("((1 + 2) * (3 + 4))") == 21

    def test_single_paren(self):
        assert calc("(10)") == 10

    # --- Left associativity ---
    def test_left_assoc_sub(self):
        assert calc("1 - 2 - 3") == -4

    def test_left_assoc_mixed(self):
        assert calc("1 - 2 + 3") == 2

    def test_left_assoc_div(self):
        assert calc("12 / 3 / 2") == 2

    # --- Right associativity for ** ---
    def test_right_assoc_power(self):
        assert calc("2 ** 3 ** 2") == 512

    # --- Unary minus ---
    def test_unary_minus(self):
        assert calc("-5") == -5

    def test_double_unary_minus(self):
        assert calc("--5") == 5

    def test_negated_paren(self):
        assert calc("-(-5)") == 5

    def test_mul_unary(self):
        assert calc("2 * -3") == -6

    def test_unary_power(self):
        assert calc("-2 ** 2") == 4

    def test_negated_power_paren(self):
        assert calc("-(2 ** 2)") == -4

    # --- Decimals ---
    def test_decimal_mul(self):
        assert calc("3.14 * 2") == pytest.approx(6.28)

    def test_leading_dot(self):
        assert calc(".5 + .5") == 1

    # --- Complex expressions ---
    def test_complex_1(self):
        assert calc("2 + 3 * 4 - 1") == 13

    def test_complex_2(self):
        assert calc("(2 + 3) * (4 - 1) / 5") == 3

    def test_complex_3(self):
        assert calc("10 % 3 + 2 ** 3") == 9

    def test_complex_4(self):
        assert calc("2 ** (1 + 2)") == 8

    def test_complex_5(self):
        assert calc("100 / 10 / 2 + 3") == 8

    # --- Error cases ---
    def test_empty_string(self):
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

    def test_missing_rparen(self):
        with pytest.raises(ValueError, match="Expected rparen"):
            calc("(2 + 3")

    def test_unexpected_char(self):
        with pytest.raises(ValueError, match="Unexpected character"):
            calc("2 @ 3")

    def test_trailing_operator(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            calc("2 +")
