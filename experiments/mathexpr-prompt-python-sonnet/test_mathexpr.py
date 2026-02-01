"""Comprehensive tests for the math expression evaluator."""

import pytest
from mathexpr import calc


class TestBasicArithmetic:
    """Test basic arithmetic operations."""
    
    def test_addition(self):
        assert calc("2 + 3") == 5
        assert calc("10 + 20 + 30") == 60
        assert calc("0 + 0") == 0
        assert calc("1.5 + 2.5") == 4.0
    
    def test_subtraction(self):
        assert calc("5 - 3") == 2
        assert calc("10 - 20") == -10
        assert calc("0 - 5") == -5
        assert calc("5.5 - 2.5") == 3.0
    
    def test_multiplication(self):
        assert calc("3 * 4") == 12
        assert calc("2 * 3 * 4") == 24
        assert calc("0 * 100") == 0
        assert calc("2.5 * 4") == 10.0
    
    def test_division(self):
        assert calc("10 / 2") == 5
        assert calc("7 / 2") == 3.5
        assert calc("0 / 5") == 0
        assert calc("9 / 3 / 3") == 1.0
    
    def test_modulo(self):
        assert calc("10 % 3") == 1
        assert calc("20 % 7") == 6
        assert calc("4 % 2") == 0
        assert calc("5.5 % 2") == 1.5
    
    def test_exponentiation(self):
        assert calc("2 ** 3") == 8
        assert calc("5 ** 2") == 25
        assert calc("10 ** 0") == 1
        assert calc("2 ** 0.5") == pytest.approx(1.414213, rel=1e-5)


class TestOperatorPrecedence:
    """Test operator precedence rules."""
    
    def test_multiply_before_add(self):
        assert calc("2 + 3 * 4") == 14  # not 20
        assert calc("3 * 4 + 2") == 14
    
    def test_divide_before_subtract(self):
        assert calc("10 - 6 / 2") == 7  # not 2
        assert calc("6 / 2 - 1") == 2
    
    def test_power_before_multiply(self):
        assert calc("2 * 3 ** 2") == 18  # not 36
        assert calc("3 ** 2 * 2") == 18
    
    def test_power_before_divide(self):
        assert calc("8 / 2 ** 2") == 2  # not 16
        assert calc("2 ** 2 / 2") == 2
    
    def test_complex_precedence(self):
        assert calc("2 + 3 * 4 - 5") == 9
        assert calc("2 * 3 + 4 * 5") == 26
        assert calc("2 ** 3 * 4 + 5") == 37


class TestAssociativity:
    """Test operator associativity."""
    
    def test_left_associative_subtraction(self):
        assert calc("10 - 5 - 2") == 3  # (10 - 5) - 2 = 3, not 10 - (5 - 2) = 7
        assert calc("1 - 2 - 3") == -4
    
    def test_left_associative_division(self):
        assert calc("20 / 4 / 2") == 2.5  # (20 / 4) / 2 = 2.5, not 20 / (4 / 2) = 10
        assert calc("100 / 10 / 2") == 5
    
    def test_left_associative_modulo(self):
        assert calc("10 % 6 % 3") == 1  # (10 % 6) % 3 = 4 % 3 = 1
    
    def test_right_associative_power(self):
        assert calc("2 ** 3 ** 2") == 512  # 2 ** (3 ** 2) = 2 ** 9 = 512, not (2 ** 3) ** 2 = 64
        assert calc("2 ** 2 ** 3") == 256  # 2 ** (2 ** 3) = 2 ** 8 = 256


class TestUnaryMinus:
    """Test unary negation."""
    
    def test_simple_negation(self):
        assert calc("-5") == -5
        assert calc("-3.14") == -3.14
        assert calc("-0") == 0
    
    def test_double_negation(self):
        assert calc("--5") == 5
        assert calc("---5") == -5
        assert calc("----5") == 5
    
    def test_negation_with_operations(self):
        assert calc("2 * -3") == -6
        assert calc("-2 * 3") == -6
        assert calc("-2 * -3") == 6
        assert calc("10 + -5") == 5
        assert calc("10 - -5") == 15
    
    def test_negation_with_parentheses(self):
        assert calc("-(2 + 3)") == -5
        assert calc("-(-5)") == 5
        assert calc("-(3 * 4)") == -12
    
    def test_negation_with_power(self):
        assert calc("-2 ** 2") == -4  # -(2 ** 2) based on precedence
        assert calc("(-2) ** 2") == 4


class TestParentheses:
    """Test parentheses for grouping."""
    
    def test_simple_grouping(self):
        assert calc("(2 + 3) * 4") == 20
        assert calc("2 * (3 + 4)") == 14
        assert calc("(10 - 5) / 5") == 1
    
    def test_nested_parentheses(self):
        assert calc("((2 + 3) * 4)") == 20
        assert calc("(2 + (3 * 4))") == 14
        assert calc("((2 + 3) * (4 + 5))") == 45
    
    def test_multiple_groups(self):
        assert calc("(2 + 3) * (4 + 5)") == 45
        assert calc("(10 / 2) + (6 / 3)") == 7
    
    def test_deeply_nested(self):
        assert calc("(((1 + 2)))") == 3
        assert calc("((2 * (3 + 4)) - 1)") == 13


class TestDecimalNumbers:
    """Test decimal number support."""
    
    def test_standard_decimals(self):
        assert calc("3.14") == 3.14
        assert calc("2.5 + 1.5") == 4.0
        assert calc("10.5 / 2") == 5.25
    
    def test_leading_dot(self):
        assert calc(".5") == 0.5
        assert calc(".25 * 4") == 1.0
        assert calc("1 + .5") == 1.5
    
    def test_trailing_zero(self):
        assert calc("5.0") == 5.0
        assert calc("2.0 + 3.0") == 5.0
    
    def test_mixed_integer_decimal(self):
        assert calc("5 + 2.5") == 7.5
        assert calc("10 / 4.0") == 2.5


class TestComplexExpressions:
    """Test complex multi-operator expressions."""
    
    def test_all_operators(self):
        assert calc("2 + 3 * 4 - 5 / 2") == 11.5
        assert calc("10 % 3 + 2 ** 3") == 9
    
    def test_with_parentheses_and_precedence(self):
        assert calc("2 + 3 * (4 - 1)") == 11
        assert calc("(2 + 3) * (4 - 1)") == 15
        assert calc("2 ** (3 + 1) / 4") == 4
    
    def test_with_unary_and_parentheses(self):
        assert calc("-(2 + 3) * -4") == 20
        assert calc("-2 * (3 + -4)") == 2
    
    def test_realistic_calculations(self):
        assert calc("(100 - 32) * 5 / 9") == pytest.approx(37.777, rel=1e-3)  # Fahrenheit to Celsius
        assert calc("2 * 3.14159 * 5") == pytest.approx(31.4159, rel=1e-5)  # Circumference


class TestWhitespace:
    """Test whitespace handling."""
    
    def test_with_spaces(self):
        assert calc("2 + 3") == 5
        assert calc("2+3") == 5
        assert calc("  2  +  3  ") == 5
    
    def test_no_spaces(self):
        assert calc("2+3*4") == 14
        assert calc("(2+3)*(4+5)") == 45
    
    def test_mixed_spacing(self):
        assert calc("2+ 3 *4") == 14
        assert calc("  10  /  2  ") == 5


class TestErrorHandling:
    """Test error cases."""
    
    def test_empty_input(self):
        with pytest.raises(ValueError, match="Empty input"):
            calc("")
        with pytest.raises(ValueError, match="Empty input"):
            calc("   ")
    
    def test_division_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            calc("5 / 0")
        with pytest.raises(ValueError, match="Division by zero"):
            calc("10 / (2 - 2)")
    
    def test_modulo_by_zero(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            calc("5 % 0")
        with pytest.raises(ValueError, match="Modulo by zero"):
            calc("10 % (3 - 3)")
    
    def test_unmatched_parentheses(self):
        with pytest.raises(ValueError, match="[Uu]nmatched|parenthes"):
            calc("(2 + 3")
        with pytest.raises(ValueError, match="[Uu]nmatched|parenthes"):
            calc("2 + 3)")
        with pytest.raises(ValueError, match="[Uu]nmatched|parenthes"):
            calc("((2 + 3)")
        with pytest.raises(ValueError, match="[Uu]nmatched|parenthes"):
            calc("(2 + 3))")
    
    def test_invalid_characters(self):
        with pytest.raises(ValueError, match="Invalid"):
            calc("2 + 3 & 4")
        with pytest.raises(ValueError, match="Invalid"):
            calc("2 @ 3")
        with pytest.raises(ValueError, match="Invalid"):
            calc("abc")
    
    def test_malformed_expressions(self):
        with pytest.raises(ValueError, match="[Mm]alformed|[Uu]nexpected"):
            calc("2 +")
        with pytest.raises(ValueError, match="[Mm]alformed|[Uu]nexpected"):
            calc("* 3")
        with pytest.raises(ValueError, match="[Mm]alformed|[Uu]nexpected"):
            calc("2 + * 3")
        with pytest.raises(ValueError, match="[Mm]alformed|[Uu]nexpected"):
            calc("2 3")
    
    def test_multiple_decimal_points(self):
        with pytest.raises(ValueError, match="Invalid|decimal"):
            calc("3.14.15")


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_zero_operations(self):
        assert calc("0") == 0
        assert calc("0 + 0") == 0
        assert calc("0 * 100") == 0
        assert calc("0 - 0") == 0
    
    def test_single_number(self):
        assert calc("42") == 42
        assert calc("3.14") == 3.14
        assert calc("-5") == -5
    
    def test_power_edge_cases(self):
        assert calc("0 ** 0") == 1  # Python's behavior
        assert calc("1 ** 100") == 1
        assert calc("0 ** 5") == 0
    
    def test_very_nested_parentheses(self):
        assert calc("((((((5))))))") == 5
        assert calc("(((2 + 3)))") == 5
    
    def test_long_chain(self):
        assert calc("1 + 1 + 1 + 1 + 1") == 5
        assert calc("2 * 2 * 2 * 2") == 16
