"""Test suite for mathexpr using test vectors from SPEC.md."""

import pytest
from mathexpr import Token, tokenize, parse, evaluate, calc
from mathexpr import number_literal, unary_expr, binary_expr


class TestTokenizer:
    """Tokenizer test vectors from SPEC.md."""
    
    def test_empty_string(self):
        """Empty string produces no tokens."""
        assert tokenize("") == []
    
    def test_whitespace_only(self):
        """Whitespace-only string produces no tokens."""
        assert tokenize("   \t\n  ") == []
    
    def test_simple_number(self):
        """Simple integer token."""
        result = tokenize("42")
        assert len(result) == 1
        assert result[0].kind == 'number'
        assert result[0].value == '42'
    
    def test_decimal_number(self):
        """Decimal number token."""
        result = tokenize("3.14")
        assert len(result) == 1
        assert result[0].kind == 'number'
        assert result[0].value == '3.14'
    
    def test_number_starting_with_dot(self):
        """Number starting with dot."""
        result = tokenize(".5")
        assert len(result) == 1
        assert result[0].kind == 'number'
        assert result[0].value == '.5'
    
    def test_all_operators(self):
        """All operator tokens."""
        result = tokenize("+ - * / % **")
        expected_kinds = ['plus', 'minus', 'star', 'slash', 'percent', 'power']
        expected_values = ['+', '-', '*', '/', '%', '**']
        
        assert len(result) == 6
        for i, (kind, value) in enumerate(zip(expected_kinds, expected_values)):
            assert result[i].kind == kind
            assert result[i].value == value
    
    def test_parentheses(self):
        """Parentheses tokens."""
        result = tokenize("(1)")
        assert len(result) == 3
        assert result[0].kind == 'lparen'
        assert result[1].kind == 'number'
        assert result[2].kind == 'rparen'
    
    def test_complex_expression(self):
        """Complex expression tokenization."""
        result = tokenize("2 + 3 * (4 - 1)")
        expected = [
            ('number', '2'),
            ('plus', '+'),
            ('number', '3'),
            ('star', '*'),
            ('lparen', '('),
            ('number', '4'),
            ('minus', '-'),
            ('number', '1'),
            ('rparen', ')'),
        ]
        
        assert len(result) == len(expected)
        for token, (kind, value) in zip(result, expected):
            assert token.kind == kind
            assert token.value == value
    
    def test_power_operator(self):
        """Power operator is a single token, not two stars."""
        result = tokenize("2**3*4")
        assert len(result) == 5
        assert result[0].kind == 'number'
        assert result[1].kind == 'power'
        assert result[1].value == '**'
        assert result[2].kind == 'number'
        assert result[3].kind == 'star'
        assert result[4].kind == 'number'
    
    def test_no_spaces(self):
        """Tokens without spaces."""
        result = tokenize("1+2")
        assert len(result) == 3
        assert result[0].kind == 'number'
        assert result[1].kind == 'plus'
        assert result[2].kind == 'number'
    
    def test_tokenizer_error_double_dot(self):
        """Double decimal point is an error."""
        with pytest.raises(ValueError, match="Unexpected character"):
            tokenize("1.2.3")
    
    def test_tokenizer_error_invalid_char(self):
        """Invalid character raises error."""
        with pytest.raises(ValueError, match="Unexpected character.*@.*position 2"):
            tokenize("2 @ 3")


class TestParser:
    """Parser test vectors from SPEC.md."""
    
    def test_number_literal(self):
        """Parse a simple number."""
        tokens = tokenize("42")
        ast = parse(tokens)
        assert ast == number_literal(42.0)
    
    def test_decimal_literal(self):
        """Parse a decimal number."""
        tokens = tokenize("3.14")
        ast = parse(tokens)
        assert ast == number_literal(3.14)
    
    def test_parenthesized_number(self):
        """Parse parenthesized number."""
        tokens = tokenize("(42)")
        ast = parse(tokens)
        assert ast == number_literal(42.0)
    
    def test_double_parentheses(self):
        """Parse double parentheses."""
        tokens = tokenize("((7))")
        ast = parse(tokens)
        assert ast == number_literal(7.0)
    
    def test_addition(self):
        """Parse addition."""
        tokens = tokenize("2 + 3")
        ast = parse(tokens)
        assert ast == binary_expr('+', number_literal(2.0), number_literal(3.0))
    
    def test_subtraction(self):
        """Parse subtraction."""
        tokens = tokenize("5 - 1")
        ast = parse(tokens)
        assert ast == binary_expr('-', number_literal(5.0), number_literal(1.0))
    
    def test_multiplication(self):
        """Parse multiplication."""
        tokens = tokenize("4 * 6")
        ast = parse(tokens)
        assert ast == binary_expr('*', number_literal(4.0), number_literal(6.0))
    
    def test_division(self):
        """Parse division."""
        tokens = tokenize("10 / 2")
        ast = parse(tokens)
        assert ast == binary_expr('/', number_literal(10.0), number_literal(2.0))
    
    def test_modulo(self):
        """Parse modulo."""
        tokens = tokenize("10 % 3")
        ast = parse(tokens)
        assert ast == binary_expr('%', number_literal(10.0), number_literal(3.0))
    
    def test_power(self):
        """Parse power."""
        tokens = tokenize("2 ** 3")
        ast = parse(tokens)
        assert ast == binary_expr('**', number_literal(2.0), number_literal(3.0))
    
    def test_precedence_add_mul(self):
        """Multiplication has higher precedence than addition."""
        tokens = tokenize("2 + 3 * 4")
        ast = parse(tokens)
        expected = binary_expr('+', number_literal(2.0),
                              binary_expr('*', number_literal(3.0), number_literal(4.0)))
        assert ast == expected
    
    def test_precedence_mul_power(self):
        """Power has higher precedence than multiplication."""
        tokens = tokenize("2 * 3 ** 2")
        ast = parse(tokens)
        expected = binary_expr('*', number_literal(2.0),
                              binary_expr('**', number_literal(3.0), number_literal(2.0)))
        assert ast == expected
    
    def test_precedence_parentheses(self):
        """Parentheses override precedence."""
        tokens = tokenize("(2 + 3) * 4")
        ast = parse(tokens)
        expected = binary_expr('*', 
                              binary_expr('+', number_literal(2.0), number_literal(3.0)),
                              number_literal(4.0))
        assert ast == expected
    
    def test_left_associativity_subtraction(self):
        """Subtraction is left-associative."""
        tokens = tokenize("1 - 2 - 3")
        ast = parse(tokens)
        expected = binary_expr('-',
                              binary_expr('-', number_literal(1.0), number_literal(2.0)),
                              number_literal(3.0))
        assert ast == expected
    
    def test_left_associativity_division(self):
        """Division is left-associative."""
        tokens = tokenize("12 / 3 / 2")
        ast = parse(tokens)
        expected = binary_expr('/',
                              binary_expr('/', number_literal(12.0), number_literal(3.0)),
                              number_literal(2.0))
        assert ast == expected
    
    def test_right_associativity_power(self):
        """Power is right-associative."""
        tokens = tokenize("2 ** 3 ** 2")
        ast = parse(tokens)
        expected = binary_expr('**', number_literal(2.0),
                              binary_expr('**', number_literal(3.0), number_literal(2.0)))
        assert ast == expected
    
    def test_unary_minus(self):
        """Parse unary minus."""
        tokens = tokenize("-5")
        ast = parse(tokens)
        assert ast == unary_expr('-', number_literal(5.0))
    
    def test_double_unary_minus(self):
        """Unary minus can chain."""
        tokens = tokenize("--5")
        ast = parse(tokens)
        expected = unary_expr('-', unary_expr('-', number_literal(5.0)))
        assert ast == expected
    
    def test_unary_with_binary(self):
        """Unary minus in binary expression."""
        tokens = tokenize("2 * -3")
        ast = parse(tokens)
        expected = binary_expr('*', number_literal(2.0),
                              unary_expr('-', number_literal(3.0)))
        assert ast == expected
    
    def test_parser_error_empty(self):
        """Empty token list is an error."""
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse([])
    
    def test_parser_error_unmatched_paren(self):
        """Unmatched left paren is an error."""
        tokens = tokenize("(2 + 3")
        with pytest.raises(ValueError, match="Expected rparen"):
            parse(tokens)
    
    def test_parser_error_extra_rparen(self):
        """Extra right paren is an error."""
        tokens = tokenize("2 + 3)")
        with pytest.raises(ValueError, match="Unexpected token after expression"):
            parse(tokens)
    
    def test_parser_error_operator_at_start(self):
        """Operator at start (without unary interpretation) is an error."""
        tokens = tokenize("* 5")
        with pytest.raises(ValueError, match="Unexpected token"):
            parse(tokens)
    
    def test_parser_error_incomplete_binary(self):
        """Incomplete binary expression is an error."""
        tokens = tokenize("2 +")
        with pytest.raises(ValueError, match="Unexpected end of input"):
            parse(tokens)


class TestEvaluator:
    """Evaluator test vectors from SPEC.md."""
    
    def test_number_literal(self):
        """Evaluate a number literal."""
        ast = number_literal(42.0)
        assert evaluate(ast) == 42.0
    
    def test_unary_minus(self):
        """Evaluate unary minus."""
        ast = unary_expr('-', number_literal(5.0))
        assert evaluate(ast) == -5.0
    
    def test_addition(self):
        """Evaluate addition."""
        ast = binary_expr('+', number_literal(2.0), number_literal(3.0))
        assert evaluate(ast) == 5.0
    
    def test_subtraction(self):
        """Evaluate subtraction."""
        ast = binary_expr('-', number_literal(10.0), number_literal(4.0))
        assert evaluate(ast) == 6.0
    
    def test_multiplication(self):
        """Evaluate multiplication."""
        ast = binary_expr('*', number_literal(3.0), number_literal(7.0))
        assert evaluate(ast) == 21.0
    
    def test_division(self):
        """Evaluate division."""
        ast = binary_expr('/', number_literal(10.0), number_literal(4.0))
        assert evaluate(ast) == 2.5
    
    def test_modulo(self):
        """Evaluate modulo."""
        ast = binary_expr('%', number_literal(10.0), number_literal(3.0))
        assert evaluate(ast) == 1.0
    
    def test_power(self):
        """Evaluate exponentiation."""
        ast = binary_expr('**', number_literal(2.0), number_literal(10.0))
        assert evaluate(ast) == 1024.0
    
    def test_division_by_zero(self):
        """Division by zero raises an error."""
        ast = binary_expr('/', number_literal(1.0), number_literal(0.0))
        with pytest.raises(ValueError, match="Division by zero"):
            evaluate(ast)
    
    def test_modulo_by_zero(self):
        """Modulo by zero raises an error."""
        ast = binary_expr('%', number_literal(1.0), number_literal(0.0))
        with pytest.raises(ValueError, match="Modulo by zero"):
            evaluate(ast)
    
    def test_complex_expression(self):
        """Evaluate a complex expression."""
        # (2 + 3) * -4 = -20
        ast = binary_expr('*',
                         binary_expr('+', number_literal(2.0), number_literal(3.0)),
                         unary_expr('-', number_literal(4.0)))
        assert evaluate(ast) == -20.0


class TestEndToEnd:
    """End-to-end calc() tests from SPEC.md."""
    
    def test_addition(self):
        assert calc("1 + 2") == 3.0
    
    def test_subtraction(self):
        assert calc("10 - 3") == 7.0
    
    def test_multiplication(self):
        assert calc("4 * 5") == 20.0
    
    def test_division(self):
        assert calc("15 / 4") == 3.75
    
    def test_modulo(self):
        assert calc("10 % 3") == 1.0
    
    def test_power(self):
        assert calc("2 ** 8") == 256.0
    
    def test_precedence_add_mul(self):
        assert calc("2 + 3 * 4") == 14.0
    
    def test_precedence_mul_add(self):
        assert calc("2 * 3 + 4") == 10.0
    
    def test_precedence_sub_mul(self):
        assert calc("10 - 2 * 3") == 4.0
    
    def test_precedence_add_power(self):
        assert calc("2 + 3 ** 2") == 11.0
    
    def test_precedence_mul_power(self):
        assert calc("2 * 3 ** 2") == 18.0
    
    def test_precedence_power_mul(self):
        assert calc("2 ** 3 * 4") == 32.0
    
    def test_parentheses_add_mul(self):
        assert calc("(2 + 3) * 4") == 20.0
    
    def test_parentheses_mul_add(self):
        assert calc("2 * (3 + 4)") == 14.0
    
    def test_parentheses_both_sides(self):
        assert calc("(2 + 3) * (4 + 5)") == 45.0
    
    def test_nested_parentheses(self):
        assert calc("((1 + 2) * (3 + 4))") == 21.0
    
    def test_single_parentheses(self):
        assert calc("(10)") == 10.0
    
    def test_left_associative_subtraction(self):
        assert calc("1 - 2 - 3") == -4.0
    
    def test_left_associative_mixed(self):
        assert calc("1 - 2 + 3") == 2.0
    
    def test_left_associative_division(self):
        assert calc("12 / 3 / 2") == 2.0
    
    def test_right_associative_power(self):
        assert calc("2 ** 3 ** 2") == 512.0
    
    def test_unary_minus_simple(self):
        assert calc("-5") == -5.0
    
    def test_unary_minus_double(self):
        assert calc("--5") == 5.0
    
    def test_unary_minus_parenthesized(self):
        assert calc("-(-5)") == 5.0
    
    def test_unary_with_multiplication(self):
        assert calc("2 * -3") == -6.0
    
    def test_unary_with_power_precedence(self):
        assert calc("-2 ** 2") == 4.0  # -(2 ** 2) = -4, but actually power > unary, so it's (-2)^2 = 4
    
    def test_unary_with_power_parentheses(self):
        assert calc("-(2 ** 2)") == -4.0
    
    def test_decimal_multiplication(self):
        assert calc("3.14 * 2") == 6.28
    
    def test_decimal_starting_with_dot(self):
        assert calc(".5 + .5") == 1.0
    
    def test_complex_expression_1(self):
        assert calc("2 + 3 * 4 - 1") == 13.0
    
    def test_complex_expression_2(self):
        assert calc("(2 + 3) * (4 - 1) / 5") == 3.0
    
    def test_complex_expression_3(self):
        assert calc("10 % 3 + 2 ** 3") == 9.0
    
    def test_complex_expression_4(self):
        assert calc("2 ** (1 + 2)") == 8.0
    
    def test_complex_expression_5(self):
        assert calc("100 / 10 / 2 + 3") == 8.0
    
    def test_error_empty_string(self):
        with pytest.raises(ValueError, match="Empty expression"):
            calc("")
    
    def test_error_whitespace_only(self):
        with pytest.raises(ValueError, match="Empty expression"):
            calc("   ")
    
    def test_error_division_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            calc("1 / 0")
    
    def test_error_modulo_by_zero(self):
        with pytest.raises(ValueError, match="Modulo by zero"):
            calc("5 % 0")
    
    def test_error_unmatched_paren(self):
        with pytest.raises(ValueError, match="Expected rparen"):
            calc("(2 + 3")
    
    def test_error_invalid_character(self):
        with pytest.raises(ValueError, match="Unexpected character"):
            calc("2 @ 3")
    
    def test_error_incomplete_expression(self):
        with pytest.raises(ValueError, match="Unexpected end of input"):
            calc("2 +")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
