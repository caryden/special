package mathexpr

import (
	"errors"
	"math"
	"testing"
)

const epsilon = 1e-9

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < epsilon
}

func TestCalcBasicArithmetic(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"integer addition", "2 + 3", 5},
		{"integer subtraction", "10 - 4", 6},
		{"integer multiplication", "3 * 7", 21},
		{"integer division", "20 / 4", 5},
		{"modulo", "10 % 3", 1},
		{"decimal addition", "1.5 + 2.5", 4},
		{"decimal multiplication", "0.1 * 0.2", 0.02},
		{"leading dot decimal", ".5 + .5", 1},
		{"single number", "42", 42},
		{"single decimal", "3.14", 3.14},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcPrecedence(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"mul before add", "2 + 3 * 4", 14},
		{"mul before sub", "10 - 2 * 3", 4},
		{"div before add", "1 + 6 / 3", 3},
		{"mod before add", "1 + 7 % 3", 2},
		{"parens override", "(2 + 3) * 4", 20},
		{"nested parens", "((2 + 3)) * 4", 20},
		{"complex precedence", "2 + 3 * 4 - 6 / 2", 11},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcAssociativity(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"left assoc subtraction", "1 - 2 - 3", -4},
		{"left assoc division", "24 / 4 / 2", 3},
		{"left assoc modulo", "17 % 5 % 3", 2},
		{"left assoc addition", "1 + 2 + 3", 6},
		{"left assoc multiplication", "2 * 3 * 4", 24},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcExponentiation(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"simple power", "2 ** 3", 8},
		{"power of 0", "5 ** 0", 1},
		{"power of 1", "5 ** 1", 5},
		{"right assoc power", "2 ** 3 ** 2", 512},
		{"fractional exponent", "4 ** 0.5", 2},
		{"power with parens", "(2 ** 3) ** 2", 64},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcUnaryMinus(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"simple negation", "-5", -5},
		{"double negative", "--5", 5},
		{"triple negative", "---5", -5},
		{"negation in expr", "2 * -3", -6},
		{"negation with parens", "-(3 + 2)", -5},
		{"negation and power", "-2 ** 2", 4}, // unary binds tighter than **, so (-2)**2 = 4
		{"neg after operator", "5 + -3", 2},
		{"neg of neg in expr", "1 - -1", 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcParentheses(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"simple grouping", "(1 + 2) * 3", 9},
		{"nested grouping", "((1 + 2) * (3 + 4))", 21},
		{"deeply nested", "(((5)))", 5},
		{"parens in power", "(2 + 1) ** 2", 9},
		{"example from prompt", "2 + 3 * (4 - 1)", 11},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcWhitespace(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"no spaces", "2+3*4", 14},
		{"lots of spaces", "  2  +  3  *  4  ", 14},
		{"tabs", "\t2\t+\t3\t", 5},
		{"leading/trailing spaces", "  42  ", 42},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestCalcErrors(t *testing.T) {
	tests := []struct {
		name    string
		expr    string
		wantErr error
	}{
		{"empty string", "", ErrEmptyInput},
		{"only spaces", "   ", ErrEmptyInput},
		{"division by zero", "1 / 0", ErrDivisionByZero},
		{"modulo by zero", "10 % 0", ErrModuloByZero},
		{"unmatched open paren", "(1 + 2", ErrUnmatchedParen},
		{"unmatched close paren", "1 + 2)", ErrMalformedExpression},
		{"invalid character", "2 & 3", ErrInvalidCharacter},
		{"invalid character letter", "abc", ErrInvalidCharacter},
		{"trailing operator", "2 +", ErrMalformedExpression},
		{"leading binary operator", "* 2", ErrMalformedExpression},
		{"double binary operator", "2 + * 3", ErrMalformedExpression},
		{"empty parens", "()", ErrMalformedExpression},
		{"multiple dots", "1.2.3", ErrMalformedExpression},
		{"lone dot", ".", ErrMalformedExpression},
		{"missing operand in div", "/ 5", ErrMalformedExpression},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Calc(tt.expr)
			if err == nil {
				t.Fatalf("Calc(%q) expected error, got nil", tt.expr)
			}
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Calc(%q) error = %v, want %v", tt.expr, err, tt.wantErr)
			}
		})
	}
}

func TestCalcDivisionByZeroInExpr(t *testing.T) {
	// Division by zero via expression evaluation
	_, err := Calc("10 / (5 - 5)")
	if !errors.Is(err, ErrDivisionByZero) {
		t.Errorf("expected ErrDivisionByZero, got %v", err)
	}
}

func TestCalcModuloByZeroInExpr(t *testing.T) {
	_, err := Calc("10 % (3 - 3)")
	if !errors.Is(err, ErrModuloByZero) {
		t.Errorf("expected ErrModuloByZero, got %v", err)
	}
}

func TestCalcComplexExpressions(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"mixed ops", "2 + 3 * 4 - 6 / 2 + 1", 12},
		{"negative result", "1 - 10", -9},
		{"chained multiplication", "2 * 3 * 4 * 5", 120},
		{"power and mul", "2 ** 3 * 3", 24},
		{"mul and power", "3 * 2 ** 3", 24},
		{"unary in parens", "(-1) * (-1)", 1},
		{"complex nesting", "(2 + 3) * (4 - (1 + 1))", 10},
		{"modulo with negation", "-7 % 3", -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Calc(%q) unexpected error: %v", tt.expr, err)
			}
			if !almostEqual(got, tt.want) {
				t.Errorf("Calc(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}
