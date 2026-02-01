package mathexpr

import (
	"fmt"
	"math"
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// Tokenizer tests
// ---------------------------------------------------------------------------

func TestTokenize(t *testing.T) {
	type tokenSpec struct {
		Kind  TokenKind
		Value string
	}

	tests := []struct {
		name   string
		input  string
		expect []tokenSpec
	}{
		{"empty string", "", nil},
		{"whitespace only", "   \t\n  ", nil},
		{"integer", "42", []tokenSpec{{TokenNumber, "42"}}},
		{"decimal", "3.14", []tokenSpec{{TokenNumber, "3.14"}}},
		{"leading dot", ".5", []tokenSpec{{TokenNumber, ".5"}}},
		{"all operators", "+ - * / % **", []tokenSpec{
			{TokenPlus, "+"}, {TokenMinus, "-"}, {TokenStar, "*"},
			{TokenSlash, "/"}, {TokenPercent, "%"}, {TokenPower, "**"},
		}},
		{"parens around number", "(1)", []tokenSpec{
			{TokenLParen, "("}, {TokenNumber, "1"}, {TokenRParen, ")"},
		}},
		{"full expression", "2 + 3 * (4 - 1)", []tokenSpec{
			{TokenNumber, "2"}, {TokenPlus, "+"}, {TokenNumber, "3"},
			{TokenStar, "*"}, {TokenLParen, "("}, {TokenNumber, "4"},
			{TokenMinus, "-"}, {TokenNumber, "1"}, {TokenRParen, ")"},
		}},
		{"power then star", "2**3*4", []tokenSpec{
			{TokenNumber, "2"}, {TokenPower, "**"}, {TokenNumber, "3"},
			{TokenStar, "*"}, {TokenNumber, "4"},
		}},
		{"no spaces", "1+2", []tokenSpec{
			{TokenNumber, "1"}, {TokenPlus, "+"}, {TokenNumber, "2"},
		}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tokens, err := Tokenize(tc.input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(tokens) != len(tc.expect) {
				t.Fatalf("got %d tokens, want %d", len(tokens), len(tc.expect))
			}
			for i, tok := range tokens {
				if tok.Kind != tc.expect[i].Kind || tok.Value != tc.expect[i].Value {
					t.Errorf("token[%d] = %s:%q, want %s:%q",
						i, tok.Kind, tok.Value, tc.expect[i].Kind, tc.expect[i].Value)
				}
			}
		})
	}
}

func TestTokenizeErrors(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		errSubstr string
	}{
		{"double dot in number", "1.2.3", "Unexpected character `.`"},
		{"invalid character", "2 @ 3", "Unexpected character `@` at position 2"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Tokenize(tc.input)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tc.errSubstr) {
				t.Errorf("error %q does not contain %q", err.Error(), tc.errSubstr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

// nodeString returns a compact string representation matching the spec notation.
// e.g. "binary(+, number(2), number(3))"
func nodeString(n Node) string {
	switch v := n.(type) {
	case NumberLiteral:
		return "number(" + cleanFloat(v.Value) + ")"
	case UnaryExpr:
		return "unary(" + v.Op + ", " + nodeString(v.Operand) + ")"
	case BinaryExpr:
		return "binary(" + v.Op + ", " + nodeString(v.Left) + ", " + nodeString(v.Right) + ")"
	default:
		return "unknown"
	}
}

// cleanFloat formats a float64 without unnecessary trailing zeros.
func cleanFloat(f float64) string {
	if f == math.Trunc(f) && !math.IsInf(f, 0) && !math.IsNaN(f) {
		return fmt.Sprintf("%d", int64(f))
	}
	s := fmt.Sprintf("%g", f)
	return s
}

func TestParser(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		expect string
	}{
		// Basic
		{"number int", "42", "number(42)"},
		{"number float", "3.14", "number(3.14)"},
		{"single paren", "(42)", "number(42)"},
		{"double paren", "((7))", "number(7)"},
		{"addition", "2 + 3", "binary(+, number(2), number(3))"},
		{"subtraction", "5 - 1", "binary(-, number(5), number(1))"},
		{"multiplication", "4 * 6", "binary(*, number(4), number(6))"},
		{"division", "10 / 2", "binary(/, number(10), number(2))"},
		{"modulo", "10 % 3", "binary(%, number(10), number(3))"},
		{"power", "2 ** 3", "binary(**, number(2), number(3))"},

		// Precedence
		{"add mul precedence", "2 + 3 * 4", "binary(+, number(2), binary(*, number(3), number(4)))"},
		{"mul power precedence", "2 * 3 ** 2", "binary(*, number(2), binary(**, number(3), number(2)))"},
		{"paren override", "(2 + 3) * 4", "binary(*, binary(+, number(2), number(3)), number(4))"},

		// Associativity
		{"sub left assoc", "1 - 2 - 3", "binary(-, binary(-, number(1), number(2)), number(3))"},
		{"div left assoc", "12 / 3 / 2", "binary(/, binary(/, number(12), number(3)), number(2))"},
		{"power right assoc", "2 ** 3 ** 2", "binary(**, number(2), binary(**, number(3), number(2)))"},

		// Unary
		{"unary minus", "-5", "unary(-, number(5))"},
		{"double unary minus", "--5", "unary(-, unary(-, number(5)))"},
		{"binary with unary", "2 * -3", "binary(*, number(2), unary(-, number(3)))"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tokens, err := Tokenize(tc.input)
			if err != nil {
				t.Fatalf("tokenize error: %v", err)
			}
			ast, err := Parse(tokens)
			if err != nil {
				t.Fatalf("parse error: %v", err)
			}
			got := nodeString(ast)
			if got != tc.expect {
				t.Errorf("got  %s\nwant %s", got, tc.expect)
			}
		})
	}
}

func TestParserErrors(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		errSubstr string
	}{
		{"empty tokens", "", "Unexpected end of input"},
		{"unmatched left paren", "(2 + 3", "Expected rparen"},
		{"trailing rparen", "2 + 3)", "Unexpected token after expression"},
		{"leading star", "* 5", "Unexpected token: star"},
		{"trailing operator", "2 +", "Unexpected end of input"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tokens, err := Tokenize(tc.input)
			if err != nil {
				t.Fatalf("tokenize error: %v", err)
			}
			_, err = Parse(tokens)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tc.errSubstr) {
				t.Errorf("error %q does not contain %q", err.Error(), tc.errSubstr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Evaluator tests
// ---------------------------------------------------------------------------

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name   string
		ast    Node
		expect float64
	}{
		{"number literal", NumberLiteral{42}, 42},
		{"unary minus", UnaryExpr{"-", NumberLiteral{5}}, -5},
		{"add", BinaryExpr{"+", NumberLiteral{2}, NumberLiteral{3}}, 5},
		{"sub", BinaryExpr{"-", NumberLiteral{10}, NumberLiteral{4}}, 6},
		{"mul", BinaryExpr{"*", NumberLiteral{3}, NumberLiteral{7}}, 21},
		{"div", BinaryExpr{"/", NumberLiteral{10}, NumberLiteral{4}}, 2.5},
		{"mod", BinaryExpr{"%", NumberLiteral{10}, NumberLiteral{3}}, 1},
		{"pow", BinaryExpr{"**", NumberLiteral{2}, NumberLiteral{10}}, 1024},
		{"nested", BinaryExpr{"*",
			BinaryExpr{"+", NumberLiteral{2}, NumberLiteral{3}},
			UnaryExpr{"-", NumberLiteral{4}},
		}, -20},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Evaluate(tc.ast)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.expect {
				t.Errorf("got %v, want %v", got, tc.expect)
			}
		})
	}
}

func TestEvaluateErrors(t *testing.T) {
	tests := []struct {
		name      string
		ast       Node
		errSubstr string
	}{
		{"division by zero", BinaryExpr{"/", NumberLiteral{1}, NumberLiteral{0}}, "Division by zero"},
		{"modulo by zero", BinaryExpr{"%", NumberLiteral{1}, NumberLiteral{0}}, "Modulo by zero"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Evaluate(tc.ast)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tc.errSubstr) {
				t.Errorf("error %q does not contain %q", err.Error(), tc.errSubstr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// End-to-end (Calc) tests
// ---------------------------------------------------------------------------

func TestCalc(t *testing.T) {
	tests := []struct {
		name   string
		expr   string
		expect float64
	}{
		{"1 + 2", "1 + 2", 3},
		{"10 - 3", "10 - 3", 7},
		{"4 * 5", "4 * 5", 20},
		{"15 / 4", "15 / 4", 3.75},
		{"10 % 3", "10 % 3", 1},
		{"2 ** 8", "2 ** 8", 256},
		{"2 + 3 * 4", "2 + 3 * 4", 14},
		{"2 * 3 + 4", "2 * 3 + 4", 10},
		{"10 - 2 * 3", "10 - 2 * 3", 4},
		{"2 + 3 ** 2", "2 + 3 ** 2", 11},
		{"2 * 3 ** 2", "2 * 3 ** 2", 18},
		{"2 ** 3 * 4", "2 ** 3 * 4", 32},
		{"(2 + 3) * 4", "(2 + 3) * 4", 20},
		{"2 * (3 + 4)", "2 * (3 + 4)", 14},
		{"(2 + 3) * (4 + 5)", "(2 + 3) * (4 + 5)", 45},
		{"((1 + 2) * (3 + 4))", "((1 + 2) * (3 + 4))", 21},
		{"(10)", "(10)", 10},
		{"1 - 2 - 3", "1 - 2 - 3", -4},
		{"1 - 2 + 3", "1 - 2 + 3", 2},
		{"12 / 3 / 2", "12 / 3 / 2", 2},
		{"2 ** 3 ** 2", "2 ** 3 ** 2", 512},
		{"-5", "-5", -5},
		{"--5", "--5", 5},
		{"-(-5)", "-(-5)", 5},
		{"2 * -3", "2 * -3", -6},
		{"-2 ** 2", "-2 ** 2", 4},
		{"-(2 ** 2)", "-(2 ** 2)", -4},
		{"3.14 * 2", "3.14 * 2", 6.28},
		{".5 + .5", ".5 + .5", 1},
		{"2 + 3 * 4 - 1", "2 + 3 * 4 - 1", 13},
		{"(2 + 3) * (4 - 1) / 5", "(2 + 3) * (4 - 1) / 5", 3},
		{"10 % 3 + 2 ** 3", "10 % 3 + 2 ** 3", 9},
		{"2 ** (1 + 2)", "2 ** (1 + 2)", 8},
		{"100 / 10 / 2 + 3", "100 / 10 / 2 + 3", 8},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Calc(tc.expr)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if math.Abs(got-tc.expect) > 1e-9 {
				t.Errorf("got %v, want %v", got, tc.expect)
			}
		})
	}
}

func TestCalcErrors(t *testing.T) {
	tests := []struct {
		name      string
		expr      string
		errSubstr string
	}{
		{"empty string", "", "Empty expression"},
		{"whitespace only", "   ", "Empty expression"},
		{"division by zero", "1 / 0", "Division by zero"},
		{"modulo by zero", "5 % 0", "Modulo by zero"},
		{"unmatched paren", "(2 + 3", "rparen"},
		{"invalid character", "2 @ 3", "Unexpected character"},
		{"unexpected end", "2 +", "Unexpected end"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Calc(tc.expr)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tc.errSubstr) {
				t.Errorf("error %q does not contain %q", err.Error(), tc.errSubstr)
			}
		})
	}
}
