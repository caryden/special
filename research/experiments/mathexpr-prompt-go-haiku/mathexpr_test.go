package mathexpr

import (
	"math"
	"testing"
)

// TestBasicArithmetic tests basic arithmetic operations
func TestBasicArithmetic(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
		wantErr  bool
	}{
		{"addition", "2 + 3", 5, false},
		{"subtraction", "5 - 3", 2, false},
		{"multiplication", "2 * 3", 6, false},
		{"division", "6 / 2", 3, false},
		{"modulo", "7 % 3", 1, false},
		{"exponentiation", "2 ** 3", 8, false},
		{"simple expr", "1", 1, false},
		{"zero", "0", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if tt.wantErr && err == nil {
				t.Errorf("Calc(%q) expected error, got nil", tt.expr)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !tt.wantErr && !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestPrecedence tests operator precedence
func TestPrecedence(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"mult before add", "2 + 3 * 4", 14},
		{"mult before subtract", "10 - 2 * 3", 4},
		{"div before add", "2 + 6 / 2", 5},
		{"exp before mult", "2 * 3 ** 2", 18},
		{"exp before add", "2 + 3 ** 2", 11},
		{"complex precedence", "2 + 3 * 4 - 1", 13},
		{"mult and div same level", "10 / 2 * 3", 15}, // left-associative: (10/2)*3
		{"add and sub same level", "10 - 3 + 2", 9},   // left-associative: (10-3)+2
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestRightAssociativity tests right-associativity of exponentiation
func TestRightAssociativity(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		// 2 ** 3 ** 2 = 2 ** 9 = 512 (not 8 ** 2 = 64)
		{"exp right-assoc", "2 ** 3 ** 2", 512},
		{"exp chain", "2 ** 2 ** 3", 256}, // 2 ** 8 = 256
		{"triple exp", "2 ** 2 ** 2 ** 2", 65536}, // 2 ** (2 ** 4) = 2 ** 16
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestLeftAssociativity tests left-associativity of other operators
func TestLeftAssociativity(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		// 1 - 2 - 3 = (1 - 2) - 3 = -4 (not 1 - (2 - 3) = 2)
		{"sub left-assoc", "1 - 2 - 3", -4},
		{"div left-assoc", "10 / 2 / 5", 1}, // (10/2)/5 = 5/5 = 1
		{"div and mult", "10 * 2 / 4", 5},   // (10*2)/4 = 20/4 = 5
		{"mult and div", "10 / 2 * 4", 20},  // (10/2)*4 = 5*4 = 20
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestUnaryNegation tests unary negation
func TestUnaryNegation(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"simple unary", "-5", -5},
		{"unary in expr", "2 * -3", -6},
		{"unary in paren", "-(2 + 3)", -5},
		{"double negative", "--5", 5},
		{"triple negative", "---5", -5},
		{"double neg in expr", "2 * --3", 6},
		{"unary with 0", "-0", 0},
		{"unary with decimal", "-3.14", -3.14},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestParentheses tests parenthesized expressions
func TestParentheses(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"simple parens", "(2 + 3)", 5},
		{"parens override precedence", "(2 + 3) * 4", 20},
		{"nested parens", "((2 + 3) * 4)", 20},
		{"deep nesting", "(((2)))", 2},
		{"parens with subtraction", "(10 - 3) * 2", 14},
		{"parens in denominator", "10 / (2 + 3)", 2},
		{"complex example", "2 + 3 * (4 - 1)", 11},
		{"multiple parens", "(2 + 3) * (4 - 1)", 15},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestDecimalNumbers tests decimal number support
func TestDecimalNumbers(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"simple decimal", "3.14", 3.14},
		{"decimal with addition", "1.5 + 2.5", 4},
		{"leading dot", ".5", 0.5},
		{"leading dot with op", ".5 + .5", 1},
		{"trailing zero", "1.0", 1},
		{"many decimals", "3.14159", 3.14159},
		{"decimal operations", "3.5 * 2", 7},
		{"decimal division", "5 / 2", 2.5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestComplexExpressions tests complex expressions combining multiple features
func TestComplexExpressions(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"readme example", "2 + 3 * (4 - 1)", 11},
		{"with unary", "2 * -3 + 5", -1},
		{"exp with parens", "(2 + 3) ** 2", 25},
		{"complex mixed", "-2 + 3 * 4 ** 2", 46},
		{"decimal and parens", "(1.5 + 2.5) * 2", 8},
		{"with modulo", "10 % 3 + 2", 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestWhitespace tests handling of whitespace
func TestWhitespace(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"no spaces", "2+3", 5},
		{"extra spaces", "2  +  3", 5},
		{"leading/trailing spaces", "  2 + 3  ", 5},
		{"spaces in parens", "( 2 + 3 ) * 4", 20},
		{"tabs and spaces", "2\t+\t3", 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// TestErrorHandling tests error cases
func TestErrorHandling(t *testing.T) {
	tests := []struct {
		name    string
		expr    string
		wantErr bool
		errMsg  string
	}{
		{"empty string", "", true, "empty input"},
		{"whitespace only", "   ", true, "empty input"},
		{"division by zero", "1 / 0", true, "division by zero"},
		{"modulo by zero", "5 % 0", true, "modulo by zero"},
		{"unmatched lparen", "(2 + 3", true, "unmatched"},
		{"unmatched rparen", "2 + 3)", true, "unmatched"},
		{"invalid character", "2 & 3", true, "invalid character"},
		{"trailing operator", "2 +", true, "unexpected"},
		{"leading plus", "+ 2", true, "unexpected"},
		{"double plus", "2 ++ 3", true, "unexpected"},
		{"empty parens", "()", true, "unexpected"},
		{"invalid decimal", "2.3.4", true, "unexpected"},
		{"just decimal point", ".", true, "invalid number"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if !tt.wantErr && err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if tt.wantErr && err == nil {
				t.Errorf("Calc(%q) expected error, got result: %v", tt.expr, result)
			}
		})
	}
}

// TestEdgeCases tests edge cases
func TestEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{"zero arithmetic", "0 + 0", 0},
		{"zero multiply", "100 * 0", 0},
		{"zero exponent", "5 ** 0", 1},
		{"zero base", "0 ** 5", 0},
		{"one exponent", "5 ** 1", 5},
		{"negative exponent", "2 ** -1", 0.5},
		{"negative mod base", "-7 % 3", -1},
		{"negative mod divisor", "7 % -3", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !floatEqual(result, tt.expected) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, result, tt.expected)
			}
		})
	}
}

// floatEqual compares two floats with a small epsilon for floating point errors
func floatEqual(a, b float64) bool {
	epsilon := 1e-9
	if math.IsNaN(a) && math.IsNaN(b) {
		return true
	}
	if math.IsNaN(a) || math.IsNaN(b) {
		return false
	}
	return math.Abs(a-b) < epsilon
}
