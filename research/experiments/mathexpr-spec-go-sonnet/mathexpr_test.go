package mathexpr

import (
	"fmt"
	"math"
	"strings"
	"testing"
)

// Helper function to compare tokens
func tokensEqual(t *testing.T, got, want []Token) bool {
	if len(got) != len(want) {
		t.Errorf("Token count mismatch: got %d, want %d", len(got), len(want))
		return false
	}
	for i := range got {
		if got[i].Kind != want[i].Kind || got[i].Value != want[i].Value {
			t.Errorf("Token %d mismatch: got %+v, want %+v", i, got[i], want[i])
			return false
		}
	}
	return true
}

// Helper function to format AST for comparison
func formatAST(node AstNode) string {
	switch n := node.(type) {
	case NumberLiteral:
		// Format numbers to remove unnecessary decimals
		if n.Value == float64(int(n.Value)) {
			return fmt.Sprintf("number(%d)", int(n.Value))
		}
		return fmt.Sprintf("number(%g)", n.Value)
	case UnaryExpr:
		return fmt.Sprintf("unary(%s, %s)", n.Op, formatAST(n.Operand))
	case BinaryExpr:
		return fmt.Sprintf("binary(%s, %s, %s)", n.Op, formatAST(n.Left), formatAST(n.Right))
	default:
		return "unknown"
	}
}

// TestTokenizer tests the tokenizer with exact test vectors from the spec
func TestTokenizer(t *testing.T) {
	tests := []struct {
		input string
		want  []Token
	}{
		{"", []Token{}},
		{"   \t\n  ", []Token{}},
		{"42", []Token{{TokenNumber, "42"}}},
		{"3.14", []Token{{TokenNumber, "3.14"}}},
		{".5", []Token{{TokenNumber, ".5"}}},
		{"+ - * / % **", []Token{
			{TokenPlus, "+"},
			{TokenMinus, "-"},
			{TokenStar, "*"},
			{TokenSlash, "/"},
			{TokenPercent, "%"},
			{TokenPower, "**"},
		}},
		{"(1)", []Token{
			{TokenLParen, "("},
			{TokenNumber, "1"},
			{TokenRParen, ")"},
		}},
		{"2 + 3 * (4 - 1)", []Token{
			{TokenNumber, "2"},
			{TokenPlus, "+"},
			{TokenNumber, "3"},
			{TokenStar, "*"},
			{TokenLParen, "("},
			{TokenNumber, "4"},
			{TokenMinus, "-"},
			{TokenNumber, "1"},
			{TokenRParen, ")"},
		}},
		{"2**3*4", []Token{
			{TokenNumber, "2"},
			{TokenPower, "**"},
			{TokenNumber, "3"},
			{TokenStar, "*"},
			{TokenNumber, "4"},
		}},
		{"1+2", []Token{
			{TokenNumber, "1"},
			{TokenPlus, "+"},
			{TokenNumber, "2"},
		}},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got, err := Tokenize(tt.input)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			tokensEqual(t, got, tt.want)
		})
	}
}

// TestTokenizerErrors tests tokenizer error cases
func TestTokenizerErrors(t *testing.T) {
	tests := []struct {
		input       string
		wantErrText string
	}{
		{"1.2.3", "Unexpected character ."},
		{"2 @ 3", "Unexpected character @ at position 2"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			_, err := Tokenize(tt.input)
			if err == nil {
				t.Fatal("Expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErrText) {
				t.Errorf("Error mismatch: got %q, want substring %q", err.Error(), tt.wantErrText)
			}
		})
	}
}

// TestParser tests the parser with exact test vectors from the spec
func TestParser(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		// Basic literals
		{"42", "number(42)"},
		{"3.14", "number(3.14)"},
		{"(42)", "number(42)"},
		{"((7))", "number(7)"},

		// Binary operators
		{"2 + 3", "binary(+, number(2), number(3))"},
		{"5 - 1", "binary(-, number(5), number(1))"},
		{"4 * 6", "binary(*, number(4), number(6))"},
		{"10 / 2", "binary(/, number(10), number(2))"},
		{"10 % 3", "binary(%, number(10), number(3))"},
		{"2 ** 3", "binary(**, number(2), number(3))"},

		// Precedence
		{"2 + 3 * 4", "binary(+, number(2), binary(*, number(3), number(4)))"},
		{"2 * 3 ** 2", "binary(*, number(2), binary(**, number(3), number(2)))"},
		{"(2 + 3) * 4", "binary(*, binary(+, number(2), number(3)), number(4))"},

		// Associativity
		{"1 - 2 - 3", "binary(-, binary(-, number(1), number(2)), number(3))"},
		{"12 / 3 / 2", "binary(/, binary(/, number(12), number(3)), number(2))"},
		{"2 ** 3 ** 2", "binary(**, number(2), binary(**, number(3), number(2)))"},

		// Unary
		{"-5", "unary(-, number(5))"},
		{"--5", "unary(-, unary(-, number(5)))"},
		{"2 * -3", "binary(*, number(2), unary(-, number(3)))"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			tokens, err := Tokenize(tt.input)
			if err != nil {
				t.Fatalf("Tokenize error: %v", err)
			}
			ast, err := Parse(tokens)
			if err != nil {
				t.Fatalf("Parse error: %v", err)
			}
			got := formatAST(ast)
			if got != tt.want {
				t.Errorf("AST mismatch:\n  got:  %s\n  want: %s", got, tt.want)
			}
		})
	}
}

// TestParserErrors tests parser error cases
func TestParserErrors(t *testing.T) {
	tests := []struct {
		input       string
		wantErrText string
	}{
		{"", "Unexpected end of input"},
		{"(2 + 3", "Expected rparen"},
		{"2 + 3)", "Unexpected token after expression"},
		{"* 5", "Unexpected token: star"},
		{"2 +", "Unexpected end of input"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			tokens, err := Tokenize(tt.input)
			if err != nil {
				// Tokenizer error, not parser error
				t.Skipf("Tokenizer error: %v", err)
			}
			_, err = Parse(tokens)
			if err == nil {
				t.Fatal("Expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErrText) {
				t.Errorf("Error mismatch: got %q, want substring %q", err.Error(), tt.wantErrText)
			}
		})
	}
}

// TestEvaluator tests the evaluator with exact test vectors from the spec
func TestEvaluator(t *testing.T) {
	tests := []struct {
		name string
		ast  AstNode
		want float64
	}{
		{"number(42)", NumberLiteral{Value: 42}, 42},
		{"unary(-, number(5))", UnaryExpr{Op: "-", Operand: NumberLiteral{Value: 5}}, -5},
		{"binary(+, number(2), number(3))", BinaryExpr{Op: "+", Left: NumberLiteral{Value: 2}, Right: NumberLiteral{Value: 3}}, 5},
		{"binary(-, number(10), number(4))", BinaryExpr{Op: "-", Left: NumberLiteral{Value: 10}, Right: NumberLiteral{Value: 4}}, 6},
		{"binary(*, number(3), number(7))", BinaryExpr{Op: "*", Left: NumberLiteral{Value: 3}, Right: NumberLiteral{Value: 7}}, 21},
		{"binary(/, number(10), number(4))", BinaryExpr{Op: "/", Left: NumberLiteral{Value: 10}, Right: NumberLiteral{Value: 4}}, 2.5},
		{"binary(%, number(10), number(3))", BinaryExpr{Op: "%", Left: NumberLiteral{Value: 10}, Right: NumberLiteral{Value: 3}}, 1},
		{"binary(**, number(2), number(10))", BinaryExpr{Op: "**", Left: NumberLiteral{Value: 2}, Right: NumberLiteral{Value: 10}}, 1024},
		{
			"binary(*, binary(+, number(2), number(3)), unary(-, number(4)))",
			BinaryExpr{
				Op: "*",
				Left: BinaryExpr{
					Op:    "+",
					Left:  NumberLiteral{Value: 2},
					Right: NumberLiteral{Value: 3},
				},
				Right: UnaryExpr{Op: "-", Operand: NumberLiteral{Value: 4}},
			},
			-20,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Evaluate(tt.ast)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("Result mismatch: got %v, want %v", got, tt.want)
			}
		})
	}
}

// TestEvaluatorErrors tests evaluator error cases
func TestEvaluatorErrors(t *testing.T) {
	tests := []struct {
		name        string
		ast         AstNode
		wantErrText string
	}{
		{
			"binary(/, number(1), number(0))",
			BinaryExpr{Op: "/", Left: NumberLiteral{Value: 1}, Right: NumberLiteral{Value: 0}},
			"Division by zero",
		},
		{
			"binary(%, number(1), number(0))",
			BinaryExpr{Op: "%", Left: NumberLiteral{Value: 1}, Right: NumberLiteral{Value: 0}},
			"Modulo by zero",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Evaluate(tt.ast)
			if err == nil {
				t.Fatal("Expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErrText) {
				t.Errorf("Error mismatch: got %q, want substring %q", err.Error(), tt.wantErrText)
			}
		})
	}
}

// TestCalc tests the end-to-end Calc function with exact test vectors from the spec
func TestCalc(t *testing.T) {
	tests := []struct {
		expr string
		want float64
	}{
		{"1 + 2", 3},
		{"10 - 3", 7},
		{"4 * 5", 20},
		{"15 / 4", 3.75},
		{"10 % 3", 1},
		{"2 ** 8", 256},
		{"2 + 3 * 4", 14},
		{"2 * 3 + 4", 10},
		{"10 - 2 * 3", 4},
		{"2 + 3 ** 2", 11},
		{"2 * 3 ** 2", 18},
		{"2 ** 3 * 4", 32},
		{"(2 + 3) * 4", 20},
		{"2 * (3 + 4)", 14},
		{"(2 + 3) * (4 + 5)", 45},
		{"((1 + 2) * (3 + 4))", 21},
		{"(10)", 10},
		{"1 - 2 - 3", -4},
		{"1 - 2 + 3", 2},
		{"12 / 3 / 2", 2},
		{"2 ** 3 ** 2", 512},
		{"-5", -5},
		{"--5", 5},
		{"-(-5)", 5},
		{"2 * -3", -6},
		{"-2 ** 2", 4},
		{"-(2 ** 2)", -4},
		{"3.14 * 2", 6.28},
		{".5 + .5", 1},
		{"2 + 3 * 4 - 1", 13},
		{"(2 + 3) * (4 - 1) / 5", 3},
		{"10 % 3 + 2 ** 3", 9},
		{"2 ** (1 + 2)", 8},
		{"100 / 10 / 2 + 3", 8},
	}

	for _, tt := range tests {
		t.Run(tt.expr, func(t *testing.T) {
			got, err := Calc(tt.expr)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("Result mismatch: got %v, want %v", got, tt.want)
			}
		})
	}
}

// TestCalcErrors tests end-to-end error cases
func TestCalcErrors(t *testing.T) {
	tests := []struct {
		expr        string
		wantErrText string
	}{
		{"", "Empty expression"},
		{"   ", "Empty expression"},
		{"1 / 0", "Division by zero"},
		{"5 % 0", "Modulo by zero"},
		{"(2 + 3", "Expected rparen"},
		{"2 @ 3", "Unexpected character"},
		{"2 +", "Unexpected end"},
	}

	for _, tt := range tests {
		t.Run(tt.expr, func(t *testing.T) {
			_, err := Calc(tt.expr)
			if err == nil {
				t.Fatal("Expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErrText) {
				t.Errorf("Error mismatch: got %q, want substring %q", err.Error(), tt.wantErrText)
			}
		})
	}
}
