package mathexpr

import (
	"math"
	"strings"
	"testing"
)

// --- token-types tests ---

func TestNewToken(t *testing.T) {
	tok := NewToken(TokenNumber, "42")
	if tok.Kind != TokenNumber || tok.Value != "42" {
		t.Errorf("expected Token{number, 42}, got Token{%s, %s}", tok.Kind, tok.Value)
	}

	tok = NewToken(TokenPlus, "+")
	if tok.Kind != TokenPlus || tok.Value != "+" {
		t.Errorf("expected Token{plus, +}, got Token{%s, %s}", tok.Kind, tok.Value)
	}
}

// --- tokenizer tests ---

func TestTokenizeEmpty(t *testing.T) {
	tokens, err := Tokenize("")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens, got %d", len(tokens))
	}
}

func TestTokenizeWhitespace(t *testing.T) {
	tokens, err := Tokenize("   \t\n  ")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens, got %d", len(tokens))
	}
}

func TestTokenizeNumber(t *testing.T) {
	tokens, err := Tokenize("42")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 1 || tokens[0].Kind != TokenNumber || tokens[0].Value != "42" {
		t.Errorf("unexpected tokens: %v", tokens)
	}
}

func TestTokenizeDecimal(t *testing.T) {
	tokens, err := Tokenize("3.14")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 1 || tokens[0].Value != "3.14" {
		t.Errorf("unexpected tokens: %v", tokens)
	}
}

func TestTokenizeLeadingDot(t *testing.T) {
	tokens, err := Tokenize(".5")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 1 || tokens[0].Value != ".5" {
		t.Errorf("unexpected tokens: %v", tokens)
	}
}

func TestTokenizeOperators(t *testing.T) {
	tokens, err := Tokenize("+ - * / % **")
	if err != nil {
		t.Fatal(err)
	}
	expected := []Token{
		{TokenPlus, "+"},
		{TokenMinus, "-"},
		{TokenStar, "*"},
		{TokenSlash, "/"},
		{TokenPercent, "%"},
		{TokenPower, "**"},
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok != expected[i] {
			t.Errorf("token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizeParens(t *testing.T) {
	tokens, err := Tokenize("(1)")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 3 {
		t.Fatalf("expected 3 tokens, got %d", len(tokens))
	}
	if tokens[0].Kind != TokenLParen || tokens[1].Kind != TokenNumber || tokens[2].Kind != TokenRParen {
		t.Errorf("unexpected tokens: %v", tokens)
	}
}

func TestTokenizeFullExpression(t *testing.T) {
	tokens, err := Tokenize("2 + 3 * (4 - 1)")
	if err != nil {
		t.Fatal(err)
	}
	expected := []Token{
		{TokenNumber, "2"},
		{TokenPlus, "+"},
		{TokenNumber, "3"},
		{TokenStar, "*"},
		{TokenLParen, "("},
		{TokenNumber, "4"},
		{TokenMinus, "-"},
		{TokenNumber, "1"},
		{TokenRParen, ")"},
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok != expected[i] {
			t.Errorf("token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizePowerAndStar(t *testing.T) {
	tokens, err := Tokenize("2**3*4")
	if err != nil {
		t.Fatal(err)
	}
	expected := []Token{
		{TokenNumber, "2"},
		{TokenPower, "**"},
		{TokenNumber, "3"},
		{TokenStar, "*"},
		{TokenNumber, "4"},
	}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok != expected[i] {
			t.Errorf("token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizeNoSpaces(t *testing.T) {
	tokens, err := Tokenize("1+2")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 3 {
		t.Fatalf("expected 3 tokens, got %d", len(tokens))
	}
}

func TestTokenizeErrorDoubleDot(t *testing.T) {
	_, err := Tokenize("1.2.3")
	if err == nil {
		t.Fatal("expected error for 1.2.3")
	}
}

func TestTokenizeErrorUnknownChar(t *testing.T) {
	_, err := Tokenize("2 @ 3")
	if err == nil {
		t.Fatal("expected error for @")
	}
	if !strings.Contains(err.Error(), "@") || !strings.Contains(err.Error(), "2") {
		t.Errorf("error should mention @ and position 2: %s", err.Error())
	}
}

// --- parser tests ---

func TestParseNumber(t *testing.T) {
	node, err := Parse([]Token{{TokenNumber, "2"}})
	if err != nil {
		t.Fatal(err)
	}
	num, ok := node.(NumberLiteral)
	if !ok || num.Value != 2 {
		t.Errorf("expected NumberLiteral(2), got %v", node)
	}
}

func TestParseAddition(t *testing.T) {
	tokens := []Token{
		{TokenNumber, "2"},
		{TokenPlus, "+"},
		{TokenNumber, "3"},
	}
	node, err := Parse(tokens)
	if err != nil {
		t.Fatal(err)
	}
	bin, ok := node.(BinaryExpr)
	if !ok || bin.Op != "+" {
		t.Errorf("expected Binary(+), got %v", node)
	}
}

func TestParsePrecedence(t *testing.T) {
	// 2 + 3 * 4 => Binary(+, 2, Binary(*, 3, 4))
	tokens := []Token{
		{TokenNumber, "2"},
		{TokenPlus, "+"},
		{TokenNumber, "3"},
		{TokenStar, "*"},
		{TokenNumber, "4"},
	}
	node, err := Parse(tokens)
	if err != nil {
		t.Fatal(err)
	}
	bin, ok := node.(BinaryExpr)
	if !ok || bin.Op != "+" {
		t.Fatalf("expected Binary(+), got %v", node)
	}
	right, ok := bin.Right.(BinaryExpr)
	if !ok || right.Op != "*" {
		t.Errorf("expected right to be Binary(*), got %v", bin.Right)
	}
}

func TestParsePowerRightAssoc(t *testing.T) {
	// 2 ** 3 ** 2 => Binary(**, 2, Binary(**, 3, 2))
	tokens := []Token{
		{TokenNumber, "2"},
		{TokenPower, "**"},
		{TokenNumber, "3"},
		{TokenPower, "**"},
		{TokenNumber, "2"},
	}
	node, err := Parse(tokens)
	if err != nil {
		t.Fatal(err)
	}
	bin, ok := node.(BinaryExpr)
	if !ok || bin.Op != "**" {
		t.Fatalf("expected Binary(**), got %v", node)
	}
	right, ok := bin.Right.(BinaryExpr)
	if !ok || right.Op != "**" {
		t.Errorf("expected right to be Binary(**), got %v", bin.Right)
	}
}

func TestParseUnary(t *testing.T) {
	tokens := []Token{{TokenMinus, "-"}, {TokenNumber, "5"}}
	node, err := Parse(tokens)
	if err != nil {
		t.Fatal(err)
	}
	u, ok := node.(UnaryExpr)
	if !ok || u.Op != "-" {
		t.Errorf("expected Unary(-), got %v", node)
	}
}

func TestParseDoubleUnary(t *testing.T) {
	tokens := []Token{{TokenMinus, "-"}, {TokenMinus, "-"}, {TokenNumber, "5"}}
	node, err := Parse(tokens)
	if err != nil {
		t.Fatal(err)
	}
	u, ok := node.(UnaryExpr)
	if !ok {
		t.Fatalf("expected UnaryExpr, got %T", node)
	}
	inner, ok := u.Operand.(UnaryExpr)
	if !ok {
		t.Errorf("expected inner UnaryExpr, got %T", u.Operand)
	}
	_ = inner
}

func TestParseParens(t *testing.T) {
	tokens := []Token{
		{TokenLParen, "("},
		{TokenNumber, "2"},
		{TokenPlus, "+"},
		{TokenNumber, "3"},
		{TokenRParen, ")"},
	}
	node, err := Parse(tokens)
	if err != nil {
		t.Fatal(err)
	}
	bin, ok := node.(BinaryExpr)
	if !ok || bin.Op != "+" {
		t.Errorf("expected Binary(+), got %v", node)
	}
}

func TestParseErrorEmpty(t *testing.T) {
	_, err := Parse([]Token{})
	if err == nil {
		t.Fatal("expected error for empty tokens")
	}
	if !strings.Contains(err.Error(), "end of input") {
		t.Errorf("expected 'end of input' error, got: %s", err.Error())
	}
}

func TestParseErrorTrailingPlus(t *testing.T) {
	tokens := []Token{{TokenNumber, "2"}, {TokenPlus, "+"}}
	_, err := Parse(tokens)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestParseErrorTrailingToken(t *testing.T) {
	tokens := []Token{{TokenNumber, "2"}, {TokenNumber, "3"}}
	_, err := Parse(tokens)
	if err == nil {
		t.Fatal("expected error for trailing tokens")
	}
	if !strings.Contains(err.Error(), "Unexpected token") {
		t.Errorf("expected 'Unexpected token' error, got: %s", err.Error())
	}
}

func TestParseErrorMissingRParen(t *testing.T) {
	tokens := []Token{{TokenLParen, "("}, {TokenNumber, "2"}}
	_, err := Parse(tokens)
	if err == nil {
		t.Fatal("expected error for missing rparen")
	}
	if !strings.Contains(err.Error(), "rparen") {
		t.Errorf("expected 'rparen' error, got: %s", err.Error())
	}
}

// --- evaluator tests ---

func TestEvaluateNumber(t *testing.T) {
	result, err := Evaluate(NumberLiteral{Value: 42})
	if err != nil {
		t.Fatal(err)
	}
	if result != 42 {
		t.Errorf("expected 42, got %f", result)
	}
}

func TestEvaluateDecimal(t *testing.T) {
	result, err := Evaluate(NumberLiteral{Value: 3.14})
	if err != nil {
		t.Fatal(err)
	}
	if result != 3.14 {
		t.Errorf("expected 3.14, got %f", result)
	}
}

func TestEvaluateUnary(t *testing.T) {
	result, err := Evaluate(UnaryExpr{Op: "-", Operand: NumberLiteral{Value: 5}})
	if err != nil {
		t.Fatal(err)
	}
	if result != -5 {
		t.Errorf("expected -5, got %f", result)
	}
}

func TestEvaluateDoubleUnary(t *testing.T) {
	result, err := Evaluate(UnaryExpr{Op: "-", Operand: UnaryExpr{Op: "-", Operand: NumberLiteral{Value: 7}}})
	if err != nil {
		t.Fatal(err)
	}
	if result != 7 {
		t.Errorf("expected 7, got %f", result)
	}
}

func TestEvaluateBinaryOps(t *testing.T) {
	tests := []struct {
		op       string
		left     float64
		right    float64
		expected float64
	}{
		{"+", 2, 3, 5},
		{"-", 10, 4, 6},
		{"*", 3, 7, 21},
		{"/", 15, 4, 3.75},
		{"%", 10, 3, 1},
		{"**", 2, 8, 256},
	}
	for _, tt := range tests {
		result, err := Evaluate(BinaryExpr{
			Op:    tt.op,
			Left:  NumberLiteral{Value: tt.left},
			Right: NumberLiteral{Value: tt.right},
		})
		if err != nil {
			t.Errorf("%s: unexpected error: %v", tt.op, err)
			continue
		}
		if result != tt.expected {
			t.Errorf("%g %s %g: expected %g, got %g", tt.left, tt.op, tt.right, tt.expected, result)
		}
	}
}

func TestEvaluateNestedBinary(t *testing.T) {
	// 2 + 3 * 4 = 14
	ast := BinaryExpr{
		Op:   "+",
		Left: NumberLiteral{Value: 2},
		Right: BinaryExpr{
			Op:    "*",
			Left:  NumberLiteral{Value: 3},
			Right: NumberLiteral{Value: 4},
		},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Fatal(err)
	}
	if result != 14 {
		t.Errorf("expected 14, got %f", result)
	}
}

func TestEvaluateDivisionByZero(t *testing.T) {
	_, err := Evaluate(BinaryExpr{
		Op:    "/",
		Left:  NumberLiteral{Value: 1},
		Right: NumberLiteral{Value: 0},
	})
	if err == nil {
		t.Fatal("expected division by zero error")
	}
}

func TestEvaluateModuloByZero(t *testing.T) {
	_, err := Evaluate(BinaryExpr{
		Op:    "%",
		Left:  NumberLiteral{Value: 5},
		Right: NumberLiteral{Value: 0},
	})
	if err == nil {
		t.Fatal("expected modulo by zero error")
	}
}

// --- calc (end-to-end) tests ---

func assertCalc(t *testing.T, expr string, expected float64) {
	t.Helper()
	result, err := Calc(expr)
	if err != nil {
		t.Errorf("Calc(%q): unexpected error: %v", expr, err)
		return
	}
	if math.Abs(result-expected) > 1e-9 {
		t.Errorf("Calc(%q) = %g, want %g", expr, result, expected)
	}
}

func assertCalcError(t *testing.T, expr string, substr string) {
	t.Helper()
	_, err := Calc(expr)
	if err == nil {
		t.Errorf("Calc(%q): expected error containing %q, got nil", expr, substr)
		return
	}
	if !strings.Contains(err.Error(), substr) {
		t.Errorf("Calc(%q): error %q does not contain %q", expr, err.Error(), substr)
	}
}

func TestCalcBasicOps(t *testing.T) {
	assertCalc(t, "1 + 2", 3)
	assertCalc(t, "10 - 3", 7)
	assertCalc(t, "4 * 5", 20)
	assertCalc(t, "15 / 4", 3.75)
	assertCalc(t, "10 % 3", 1)
	assertCalc(t, "2 ** 8", 256)
}

func TestCalcPrecedence(t *testing.T) {
	assertCalc(t, "2 + 3 * 4", 14)
	assertCalc(t, "2 * 3 + 4", 10)
	assertCalc(t, "10 - 2 * 3", 4)
	assertCalc(t, "2 + 3 ** 2", 11)
	assertCalc(t, "2 * 3 ** 2", 18)
	assertCalc(t, "2 ** 3 * 4", 32)
}

func TestCalcParentheses(t *testing.T) {
	assertCalc(t, "(2 + 3) * 4", 20)
	assertCalc(t, "2 * (3 + 4)", 14)
	assertCalc(t, "(2 + 3) * (4 + 5)", 45)
	assertCalc(t, "((1 + 2) * (3 + 4))", 21)
	assertCalc(t, "(10)", 10)
}

func TestCalcAssociativity(t *testing.T) {
	assertCalc(t, "1 - 2 - 3", -4)
	assertCalc(t, "1 - 2 + 3", 2)
	assertCalc(t, "12 / 3 / 2", 2)
	assertCalc(t, "2 ** 3 ** 2", 512) // right-assoc: 2^(3^2) = 2^9 = 512
}

func TestCalcUnary(t *testing.T) {
	assertCalc(t, "-5", -5)
	assertCalc(t, "--5", 5)
	assertCalc(t, "-(-5)", 5)
	assertCalc(t, "2 * -3", -6)
	assertCalc(t, "-2 ** 2", 4)   // (-2)^2 = 4, unary binds tighter
	assertCalc(t, "-(2 ** 2)", -4)
}

func TestCalcDecimals(t *testing.T) {
	assertCalc(t, "3.14 * 2", 6.28)
	assertCalc(t, ".5 + .5", 1)
}

func TestCalcComplex(t *testing.T) {
	assertCalc(t, "2 + 3 * 4 - 1", 13)
	assertCalc(t, "(2 + 3) * (4 - 1) / 5", 3)
	assertCalc(t, "10 % 3 + 2 ** 3", 9)
	assertCalc(t, "2 ** (1 + 2)", 8)
	assertCalc(t, "100 / 10 / 2 + 3", 8)
}

func TestCalcErrors(t *testing.T) {
	assertCalcError(t, "", "Empty expression")
	assertCalcError(t, "   ", "Empty expression")
	assertCalcError(t, "1 / 0", "Division by zero")
	assertCalcError(t, "5 % 0", "Modulo by zero")
	assertCalcError(t, "(2 + 3", "rparen")
	assertCalcError(t, "2 @ 3", "Unexpected character")
	assertCalcError(t, "2 +", "end of input")
}
