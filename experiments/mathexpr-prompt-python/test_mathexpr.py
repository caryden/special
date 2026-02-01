"""Comprehensive tests for the mathexpr calculator."""

import pytest
from mathexpr import calc


# ---------------------------------------------------------------------------
# Basic arithmetic
# ---------------------------------------------------------------------------

class TestBasicArithmetic:
    def test_addition(self):
        assert calc("2 + 3") == 5.0

    def test_subtraction(self):
        assert calc("10 - 4") == 6.0

    def test_multiplication(self):
        assert calc("3 * 7") == 21.0

    def test_division(self):
        assert calc("20 / 4") == 5.0

    def test_modulo(self):
        assert calc("10 % 3") == 1.0

    def test_single_number(self):
        assert calc("42") == 42.0

    def test_single_decimal(self):
        assert calc("3.14") == pytest.approx(3.14)


# ---------------------------------------------------------------------------
# Decimals
# ---------------------------------------------------------------------------

class TestDecimals:
    def test_leading_dot(self):
        assert calc(".5") == 0.5

    def test_decimal_addition(self):
        assert calc("1.5 + 2.5") == 4.0

    def test_decimal_multiplication(self):
        assert calc("0.1 * 10") == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# Exponentiation
# ---------------------------------------------------------------------------

class TestExponentiation:
    def test_simple_power(self):
        assert calc("2 ** 3") == 8.0

    def test_right_associativity(self):
        # 2 ** 3 ** 2 == 2 ** 9 == 512
        assert calc("2 ** 3 ** 2") == 512.0

    def test_power_of_zero(self):
        assert calc("5 ** 0") == 1.0

    def test_zero_to_power(self):
        assert calc("0 ** 5") == 0.0


# ---------------------------------------------------------------------------
# Operator precedence
# ---------------------------------------------------------------------------

class TestPrecedence:
    def test_mul_before_add(self):
        assert calc("2 + 3 * 4") == 14.0

    def test_div_before_sub(self):
        assert calc("10 - 6 / 2") == 7.0

    def test_exp_before_mul(self):
        assert calc("2 * 3 ** 2") == 18.0

    def test_full_precedence(self):
        # 2 + 3 * 4 ** 2 = 2 + 3 * 16 = 2 + 48 = 50
        assert calc("2 + 3 * 4 ** 2") == 50.0

    def test_mod_same_as_mul(self):
        # 2 + 10 % 3 = 2 + 1 = 3
        assert calc("2 + 10 % 3") == 3.0


# ---------------------------------------------------------------------------
# Associativity
# ---------------------------------------------------------------------------

class TestAssociativity:
    def test_left_assoc_subtraction(self):
        # (1 - 2) - 3 = -4
        assert calc("1 - 2 - 3") == -4.0

    def test_left_assoc_division(self):
        # (12 / 4) / 3 = 1
        assert calc("12 / 4 / 3") == 1.0

    def test_right_assoc_exponent(self):
        # 2 ** (3 ** 2) = 2 ** 9 = 512
        assert calc("2 ** 3 ** 2") == 512.0

    def test_left_assoc_addition(self):
        assert calc("1 + 2 + 3") == 6.0

    def test_left_assoc_modulo(self):
        # (10 % 7) % 4 = 3 % 4 = 3
        assert calc("10 % 7 % 4") == 3.0


# ---------------------------------------------------------------------------
# Unary minus
# ---------------------------------------------------------------------------

class TestUnaryMinus:
    def test_negative_number(self):
        assert calc("-5") == -5.0

    def test_double_negative(self):
        assert calc("--5") == 5.0

    def test_triple_negative(self):
        assert calc("---5") == -5.0

    def test_unary_in_expression(self):
        assert calc("2 * -3") == -6.0

    def test_unary_after_plus(self):
        assert calc("10 + -3") == 7.0

    def test_negative_exponent(self):
        # -(2 ** 3) = -8  because unary binds tighter than +/* but below exponent?
        # Actually per the spec: exponent is higher than unary? No:
        # Precedence: 1) +- 2) */% 3) ** 4) unary 5) parens
        # Unary is HIGHER than ** so -2 ** 2 means (-2) ** 2 = 4
        assert calc("-2 ** 2") == 4.0

    def test_negative_in_parens(self):
        assert calc("(-2) ** 2") == 4.0


# ---------------------------------------------------------------------------
# Parentheses
# ---------------------------------------------------------------------------

class TestParentheses:
    def test_simple_grouping(self):
        assert calc("(2 + 3) * 4") == 20.0

    def test_nested_parens(self):
        assert calc("((2 + 3))") == 5.0

    def test_deeply_nested(self):
        assert calc("(((1 + 2) * 3) - 4)") == 5.0

    def test_multiple_groups(self):
        assert calc("(1 + 2) * (3 + 4)") == 21.0

    def test_parens_override_precedence(self):
        assert calc("(2 + 3) ** 2") == 25.0


# ---------------------------------------------------------------------------
# Whitespace handling
# ---------------------------------------------------------------------------

class TestWhitespace:
    def test_no_spaces(self):
        assert calc("2+3") == 5.0

    def test_extra_spaces(self):
        assert calc("  2   +   3  ") == 5.0

    def test_tabs(self):
        assert calc("\t2\t+\t3\t") == 5.0


# ---------------------------------------------------------------------------
# Complex expressions
# ---------------------------------------------------------------------------

class TestComplex:
    def test_example_from_spec(self):
        assert calc("2 + 3 * (4 - 1)") == 11.0

    def test_mixed_ops(self):
        assert calc("10 - 2 * 3 + 4 / 2") == 6.0

    def test_exponent_chain(self):
        assert calc("3 ** 2 ** 1") == 9.0

    def test_negative_with_parens(self):
        assert calc("-(3 + 2)") == -5.0

    def test_division_result(self):
        assert calc("7 / 2") == 3.5

    def test_modulo_negative(self):
        # Python semantics for modulo
        assert calc("(-7) % 3") == pytest.approx((-7) % 3)


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestErrors:
    def test_empty_string(self):
        with pytest.raises(ValueError):
            calc("")

    def test_only_spaces(self):
        with pytest.raises(ValueError):
            calc("   ")

    def test_division_by_zero(self):
        with pytest.raises(ZeroDivisionError):
            calc("1 / 0")

    def test_modulo_by_zero(self):
        with pytest.raises(ZeroDivisionError):
            calc("1 % 0")

    def test_unmatched_open_paren(self):
        with pytest.raises(ValueError):
            calc("(2 + 3")

    def test_unmatched_close_paren(self):
        with pytest.raises(ValueError):
            calc("2 + 3)")

    def test_invalid_character(self):
        with pytest.raises(ValueError):
            calc("2 & 3")

    def test_malformed_trailing_op(self):
        with pytest.raises(ValueError):
            calc("2 +")

    def test_malformed_leading_op(self):
        # '*' is not unary, so "* 2" should fail
        with pytest.raises(ValueError):
            calc("* 2")

    def test_malformed_double_op(self):
        with pytest.raises(ValueError):
            calc("2 + * 3")

    def test_empty_parens(self):
        with pytest.raises(ValueError):
            calc("()")

    def test_invalid_letter(self):
        with pytest.raises(ValueError):
            calc("2 + abc")
