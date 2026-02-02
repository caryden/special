package mathexpr

import (
	"math"
	"testing"
)

func TestBasicArithmetic(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"1 + 2", 3},
		{"5 - 3", 2},
		{"4 * 3", 12},
		{"15 / 3", 5},
		{"10 % 3", 1},
		{"2 + 3 + 4", 9},
		{"10 - 3 - 2", 5},
		{"2 * 3 * 4", 24},
		{"100 / 5 / 2", 10},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestOperatorPrecedence(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"2 + 3 * 4", 14},         // multiplication before addition
		{"2 * 3 + 4", 10},         // multiplication before addition
		{"10 - 2 * 3", 4},         // multiplication before subtraction
		{"2 + 3 * 4 - 1", 13},     // multiplication, then left-to-right add/sub
		{"15 / 3 + 2", 7},         // division before addition
		{"2 + 15 / 3", 7},         // division before addition
		{"10 % 3 + 1", 2},         // modulo before addition
		{"2 + 3 * (4 - 1)", 11},   // parentheses highest
		{"(2 + 3) * 4", 20},       // parentheses change order
		{"2 * (3 + 4)", 14},       // parentheses change order
		{"(10 - 2) / 4", 2},       // parentheses change order
		{"2 ** 3 + 1", 9},         // exponentiation before addition
		{"2 + 3 ** 2", 11},        // exponentiation before addition
		{"2 * 3 ** 2", 18},        // exponentiation before multiplication
		{"3 ** 2 * 2", 18},        // exponentiation before multiplication
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestExponentiationRightAssociativity(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"2 ** 3", 8},
		{"2 ** 3 ** 2", 512},   // 2 ** (3 ** 2) = 2 ** 9 = 512
		{"4 ** 3 ** 2", 262144}, // 4 ** (3 ** 2) = 4 ** 9 = 262144
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestLeftAssociativity(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"1 - 2 - 3", -4},     // (1 - 2) - 3 = -4, not 1 - (2 - 3) = 2
		{"20 / 4 / 2", 2.5},   // (20 / 4) / 2 = 2.5, not 20 / (4 / 2) = 10
		{"10 % 5 % 2", 0},     // (10 % 5) % 2 = 0
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestUnaryNegation(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"-5", -5},
		{"--5", 5},             // double negative
		{"-(-5)", 5},           // parenthesized negative
		{"2 * -3", -6},         // unary in expression
		{"-2 * 3", -6},         // unary at start
		{"2 + -3", -1},         // unary after operator
		{"2 - -3", 5},          // double negative in expression
		{"-2 ** 2", 4},         // unary has higher precedence than exponentiation: (-2) ** 2
		{"(-2) ** 2", 4},       // explicit parentheses
		{"-(2 + 3)", -5},       // unary on parenthesized expression
		{"---5", -5},           // triple negative
		{"2 * -(-3)", 6},       // nested unary
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestParentheses(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"(1)", 1},
		{"((1))", 1},
		{"(((1 + 2)))", 3},
		{"(1 + 2) * (3 + 4)", 21},
		{"((2 + 3) * (4 + 5))", 45},
		{"2 * (3 + (4 * 5))", 46},
		{"(2 + 3) * (4 - 1)", 15},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestDecimals(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"3.14", 3.14},
		{".5", 0.5},
		{"0.5", 0.5},
		{"2.5 + 3.5", 6},
		{"10.5 / 2", 5.25},
		{"3.14 * 2", 6.28},
		{".5 + .5", 1},
		{"1.1 + 2.2", 3.3},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestWhitespace(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"  1  +  2  ", 3},
		{"\t5\t*\t3\t", 15},
		{"  ( 2 + 3 ) * 4  ", 20},
		{"1+2", 3}, // no whitespace
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestComplexExpressions(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"2 + 3 * 4 - 5 / 2", 11.5},
		{"(2 + 3) * 4 - 5 / 2", 17.5},
		{"2 ** 3 ** 2 + 1", 513},
		{"(2 ** 3) ** 2 + 1", 65},
		{"-2 ** 2 + 3 * (4 - 1)", 13}, // (-2)^2 + 3*3 = 4 + 9 = 13
		{"10 % 3 * 2 + 1", 3},
		{"((10 - 2) * 3 + 4) / 2", 14},
		{"-(2 ** 2) + 3 * (4 - 1)", 5}, // Explicitly parenthesize if we want -(2^2)
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Errorf("Calc(%q) returned error: %v", tt.expr, err)
			continue
		}
		if !floatEqual(result, tt.expected) {
			t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
		}
	}
}

func TestErrorEmptyInput(t *testing.T) {
	tests := []string{
		"",
		"   ",
		"\t\n",
	}

	for _, expr := range tests {
		_, err := Calc(expr)
		if err == nil {
			t.Errorf("Calc(%q) should return error for empty input", expr)
		}
	}
}

func TestErrorDivisionByZero(t *testing.T) {
	tests := []string{
		"5 / 0",
		"10 / (2 - 2)",
		"1 / (3 - 3)",
	}

	for _, expr := range tests {
		_, err := Calc(expr)
		if err == nil {
			t.Errorf("Calc(%q) should return error for division by zero", expr)
		}
	}
}

func TestErrorModuloByZero(t *testing.T) {
	tests := []string{
		"5 % 0",
		"10 % (3 - 3)",
	}

	for _, expr := range tests {
		_, err := Calc(expr)
		if err == nil {
			t.Errorf("Calc(%q) should return error for modulo by zero", expr)
		}
	}
}

func TestErrorUnmatchedParentheses(t *testing.T) {
	tests := []string{
		"(1 + 2",
		"1 + 2)",
		"((1 + 2)",
		"(1 + 2))",
		"(1 + (2 - 3)",
		"1 + 2 - 3)",
	}

	for _, expr := range tests {
		_, err := Calc(expr)
		if err == nil {
			t.Errorf("Calc(%q) should return error for unmatched parentheses", expr)
		}
	}
}

func TestErrorInvalidCharacters(t *testing.T) {
	tests := []string{
		"1 + a",
		"2 & 3",
		"5 $ 2",
		"1 @ 2",
		"x + y",
	}

	for _, expr := range tests {
		_, err := Calc(expr)
		if err == nil {
			t.Errorf("Calc(%q) should return error for invalid characters", expr)
		}
	}
}

func TestErrorMalformedExpressions(t *testing.T) {
	tests := []string{
		"2 +",
		"* 3",
		"2 + + 3",
		"2 * * 3",
		"/ 5",
		"2 /",
		"()",
		"2 + ()",
		"+ 5",
		"2 3", // missing operator
	}

	for _, expr := range tests {
		_, err := Calc(expr)
		if err == nil {
			t.Errorf("Calc(%q) should return error for malformed expression", expr)
		}
	}
}

// floatEqual checks if two floats are approximately equal
func floatEqual(a, b float64) bool {
	const epsilon = 1e-9
	return math.Abs(a-b) < epsilon
}
