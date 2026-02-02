package mathexpr

import (
	"math"
	"strings"
	"testing"
)

// Helper function to compare floats
func floatEquals(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// ====================
// token-types tests
// ====================

func TestTokenCreatesTokenWithKindAndValue(t *testing.T) {
	tok := NewToken(TokenNumber, "42")
	if tok.Kind != TokenNumber {
		t.Errorf("Expected kind %s, got %s", TokenNumber, tok.Kind)
	}
	if tok.Value != "42" {
		t.Errorf("Expected value '42', got '%s'", tok.Value)
	}
}

func TestTokenCreatesOperatorTokens(t *testing.T) {
	tests := []struct {
		kind  TokenKind
		value string
	}{
		{TokenPlus, "+"},
		{TokenMinus, "-"},
		{TokenStar, "*"},
		{TokenSlash, "/"},
		{TokenPercent, "%"},
		{TokenPower, "**"},
		{TokenLParen, "("},
		{TokenRParen, ")"},
	}

	for _, tt := range tests {
		tok := NewToken(tt.kind, tt.value)
		if tok.Kind != tt.kind || tok.Value != tt.value {
			t.Errorf("NewToken(%s, %s) = %v", tt.kind, tt.value, tok)
		}
	}
}

// ====================
// ast-types tests
// ====================

func TestNumberLiteralCreatesNumberNode(t *testing.T) {
	n := NewNumberLiteral(42)
	if n.Value != 42 {
		t.Errorf("Expected value 42, got %f", n.Value)
	}
}

func TestUnaryExprCreatesUnaryNode(t *testing.T) {
	operand := NewNumberLiteral(5)
	u := NewUnaryExpr("-", operand)
	if u.Op != "-" {
		t.Errorf("Expected op '-', got '%s'", u.Op)
	}
	if num, ok := u.Operand.(NumberLiteral); !ok || num.Value != 5 {
		t.Errorf("Expected operand NumberLiteral(5), got %v", u.Operand)
	}
}

func TestBinaryExprCreatesBinaryNode(t *testing.T) {
	left := NewNumberLiteral(2)
	right := NewNumberLiteral(3)
	b := NewBinaryExpr("+", left, right)
	if b.Op != "+" {
		t.Errorf("Expected op '+', got '%s'", b.Op)
	}
	if num, ok := b.Left.(NumberLiteral); !ok || num.Value != 2 {
		t.Errorf("Expected left NumberLiteral(2), got %v", b.Left)
	}
	if num, ok := b.Right.(NumberLiteral); !ok || num.Value != 3 {
		t.Errorf("Expected right NumberLiteral(3), got %v", b.Right)
	}
}

func TestNestedExpressions(t *testing.T) {
	// (2 + 3) * -4
	inner := NewBinaryExpr("+", NewNumberLiteral(2), NewNumberLiteral(3))
	neg := NewUnaryExpr("-", NewNumberLiteral(4))
	expr := NewBinaryExpr("*", inner, neg)

	if expr.Op != "*" {
		t.Errorf("Expected op '*', got '%s'", expr.Op)
	}

	innerBin, ok := expr.Left.(BinaryExpr)
	if !ok || innerBin.Op != "+" {
		t.Errorf("Expected left to be BinaryExpr with op '+', got %v", expr.Left)
	}

	negUnary, ok := expr.Right.(UnaryExpr)
	if !ok || negUnary.Op != "-" {
		t.Errorf("Expected right to be UnaryExpr with op '-', got %v", expr.Right)
	}
}

// ====================
// tokenizer tests
// ====================

func TestTokenizeEmptyString(t *testing.T) {
	tokens, err := Tokenize("")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(tokens) != 0 {
		t.Errorf("Expected 0 tokens, got %d", len(tokens))
	}
}

func TestTokenizeWhitespaceOnly(t *testing.T) {
	tokens, err := Tokenize("   \t\n\r  ")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(tokens) != 0 {
		t.Errorf("Expected 0 tokens, got %d", len(tokens))
	}
}

func TestTokenizeSingleInteger(t *testing.T) {
	tokens, err := Tokenize("42")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(tokens) != 1 || tokens[0].Kind != TokenNumber || tokens[0].Value != "42" {
		t.Errorf("Expected [number:42], got %v", tokens)
	}
}

func TestTokenizeDecimalNumber(t *testing.T) {
	tokens, err := Tokenize("3.14")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(tokens) != 1 || tokens[0].Kind != TokenNumber || tokens[0].Value != "3.14" {
		t.Errorf("Expected [number:3.14], got %v", tokens)
	}
}

func TestTokenizeNumberStartingWithDot(t *testing.T) {
	tokens, err := Tokenize(".5")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(tokens) != 1 || tokens[0].Kind != TokenNumber || tokens[0].Value != ".5" {
		t.Errorf("Expected [number:.5], got %v", tokens)
	}
}

func TestTokenizeAllOperators(t *testing.T) {
	tokens, err := Tokenize("+ - * / % **")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
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
		t.Errorf("Expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok.Kind != expected[i].Kind || tok.Value != expected[i].Value {
			t.Errorf("Token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizeParentheses(t *testing.T) {
	tokens, err := Tokenize("(1)")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	expected := []Token{
		{TokenLParen, "("},
		{TokenNumber, "1"},
		{TokenRParen, ")"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("Expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok.Kind != expected[i].Kind || tok.Value != expected[i].Value {
			t.Errorf("Token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizeComplexExpression(t *testing.T) {
	tokens, err := Tokenize("2 + 3 * (4 - 1)")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
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
		t.Errorf("Expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok.Kind != expected[i].Kind || tok.Value != expected[i].Value {
			t.Errorf("Token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizePowerOperatorDistinguishedFromMultiply(t *testing.T) {
	tokens, err := Tokenize("2**3*4")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	expected := []Token{
		{TokenNumber, "2"},
		{TokenPower, "**"},
		{TokenNumber, "3"},
		{TokenStar, "*"},
		{TokenNumber, "4"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("Expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok.Kind != expected[i].Kind || tok.Value != expected[i].Value {
			t.Errorf("Token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizeNoWhitespace(t *testing.T) {
	tokens, err := Tokenize("1+2")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	expected := []Token{
		{TokenNumber, "1"},
		{TokenPlus, "+"},
		{TokenNumber, "2"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("Expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, tok := range tokens {
		if tok.Kind != expected[i].Kind || tok.Value != expected[i].Value {
			t.Errorf("Token %d: expected %v, got %v", i, expected[i], tok)
		}
	}
}

func TestTokenizeMultipleDecimalsThrows(t *testing.T) {
	_, err := Tokenize("1.2.3")
	if err == nil {
		t.Fatal("Expected error for multiple decimals")
	}
	if !strings.Contains(err.Error(), "Unexpected character '.'") {
		t.Errorf("Expected error message to contain \"Unexpected character '.'\", got: %v", err)
	}
}

func TestTokenizeUnrecognizedCharacterThrows(t *testing.T) {
	_, err := Tokenize("2 @ 3")
	if err == nil {
		t.Fatal("Expected error for unrecognized character")
	}
	if !strings.Contains(err.Error(), "Unexpected character '@'") {
		t.Errorf("Expected error message to contain \"Unexpected character '@'\", got: %v", err)
	}
}

func TestTokenizeUnrecognizedCharacterReportsPosition(t *testing.T) {
	_, err := Tokenize("2 @ 3")
	if err == nil {
		t.Fatal("Expected error for unrecognized character")
	}
	if !strings.Contains(err.Error(), "position 2") {
		t.Errorf("Expected error message to contain position, got: %v", err)
	}
}

// ====================
// parser tests
// ====================

// Helper function to tokenize and parse
func p(input string) (AstNode, error) {
	tokens, err := Tokenize(input)
	if err != nil {
		return nil, err
	}
	return Parse(tokens)
}

func TestParseSingleNumber(t *testing.T) {
	ast, err := p("42")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	num, ok := ast.(NumberLiteral)
	if !ok || num.Value != 42 {
		t.Errorf("Expected NumberLiteral(42), got %v", ast)
	}
}

func TestParseDecimalNumber(t *testing.T) {
	ast, err := p("3.14")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	num, ok := ast.(NumberLiteral)
	if !ok || !floatEquals(num.Value, 3.14) {
		t.Errorf("Expected NumberLiteral(3.14), got %v", ast)
	}
}

func TestParseParenthesizedNumber(t *testing.T) {
	ast, err := p("(42)")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	num, ok := ast.(NumberLiteral)
	if !ok || num.Value != 42 {
		t.Errorf("Expected NumberLiteral(42), got %v", ast)
	}
}

func TestParseNestedParentheses(t *testing.T) {
	ast, err := p("((7))")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	num, ok := ast.(NumberLiteral)
	if !ok || num.Value != 7 {
		t.Errorf("Expected NumberLiteral(7), got %v", ast)
	}
}

func TestParseAddition(t *testing.T) {
	ast, err := p("2 + 3")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "+" {
		t.Errorf("Expected BinaryExpr with op '+', got %v", ast)
	}
	left, ok := bin.Left.(NumberLiteral)
	if !ok || left.Value != 2 {
		t.Errorf("Expected left NumberLiteral(2), got %v", bin.Left)
	}
	right, ok := bin.Right.(NumberLiteral)
	if !ok || right.Value != 3 {
		t.Errorf("Expected right NumberLiteral(3), got %v", bin.Right)
	}
}

func TestParseSubtraction(t *testing.T) {
	ast, err := p("5 - 1")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "-" {
		t.Errorf("Expected BinaryExpr with op '-', got %v", ast)
	}
}

func TestParseMultiplication(t *testing.T) {
	ast, err := p("4 * 6")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "*" {
		t.Errorf("Expected BinaryExpr with op '*', got %v", ast)
	}
}

func TestParseDivision(t *testing.T) {
	ast, err := p("10 / 2")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "/" {
		t.Errorf("Expected BinaryExpr with op '/', got %v", ast)
	}
}

func TestParseModulo(t *testing.T) {
	ast, err := p("10 % 3")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "%" {
		t.Errorf("Expected BinaryExpr with op '%%', got %v", ast)
	}
}

func TestParsePower(t *testing.T) {
	ast, err := p("2 ** 3")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "**" {
		t.Errorf("Expected BinaryExpr with op '**', got %v", ast)
	}
}

func TestParseMultiplyBeforeAdd(t *testing.T) {
	// 2 + 3 * 4 → 2 + (3 * 4)
	ast, err := p("2 + 3 * 4")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "+" {
		t.Errorf("Expected top-level BinaryExpr with op '+', got %v", ast)
	}
	right, ok := bin.Right.(BinaryExpr)
	if !ok || right.Op != "*" {
		t.Errorf("Expected right BinaryExpr with op '*', got %v", bin.Right)
	}
}

func TestParsePowerBeforeMultiply(t *testing.T) {
	// 2 * 3 ** 2 → 2 * (3 ** 2)
	ast, err := p("2 * 3 ** 2")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "*" {
		t.Errorf("Expected top-level BinaryExpr with op '*', got %v", ast)
	}
	right, ok := bin.Right.(BinaryExpr)
	if !ok || right.Op != "**" {
		t.Errorf("Expected right BinaryExpr with op '**', got %v", bin.Right)
	}
}

func TestParseParensOverridePrecedence(t *testing.T) {
	// (2 + 3) * 4
	ast, err := p("(2 + 3) * 4")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "*" {
		t.Errorf("Expected top-level BinaryExpr with op '*', got %v", ast)
	}
	left, ok := bin.Left.(BinaryExpr)
	if !ok || left.Op != "+" {
		t.Errorf("Expected left BinaryExpr with op '+', got %v", bin.Left)
	}
}

func TestParseLeftAssociativeAdd(t *testing.T) {
	// 1 - 2 - 3 → (1 - 2) - 3
	ast, err := p("1 - 2 - 3")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "-" {
		t.Errorf("Expected top-level BinaryExpr with op '-', got %v", ast)
	}
	left, ok := bin.Left.(BinaryExpr)
	if !ok || left.Op != "-" {
		t.Errorf("Expected left BinaryExpr with op '-', got %v", bin.Left)
	}
}

func TestParseLeftAssociativeMultiply(t *testing.T) {
	// 12 / 3 / 2 → (12 / 3) / 2
	ast, err := p("12 / 3 / 2")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "/" {
		t.Errorf("Expected top-level BinaryExpr with op '/', got %v", ast)
	}
	left, ok := bin.Left.(BinaryExpr)
	if !ok || left.Op != "/" {
		t.Errorf("Expected left BinaryExpr with op '/', got %v", bin.Left)
	}
}

func TestParseRightAssociativePower(t *testing.T) {
	// 2 ** 3 ** 2 → 2 ** (3 ** 2)
	ast, err := p("2 ** 3 ** 2")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "**" {
		t.Errorf("Expected top-level BinaryExpr with op '**', got %v", ast)
	}
	right, ok := bin.Right.(BinaryExpr)
	if !ok || right.Op != "**" {
		t.Errorf("Expected right BinaryExpr with op '**', got %v", bin.Right)
	}
}

func TestParseUnaryMinus(t *testing.T) {
	ast, err := p("-5")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	unary, ok := ast.(UnaryExpr)
	if !ok || unary.Op != "-" {
		t.Errorf("Expected UnaryExpr with op '-', got %v", ast)
	}
	num, ok := unary.Operand.(NumberLiteral)
	if !ok || num.Value != 5 {
		t.Errorf("Expected operand NumberLiteral(5), got %v", unary.Operand)
	}
}

func TestParseDoubleUnaryMinus(t *testing.T) {
	ast, err := p("--5")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	unary1, ok := ast.(UnaryExpr)
	if !ok || unary1.Op != "-" {
		t.Errorf("Expected outer UnaryExpr with op '-', got %v", ast)
	}
	unary2, ok := unary1.Operand.(UnaryExpr)
	if !ok || unary2.Op != "-" {
		t.Errorf("Expected inner UnaryExpr with op '-', got %v", unary1.Operand)
	}
}

func TestParseUnaryInExpression(t *testing.T) {
	// 2 * -3
	ast, err := p("2 * -3")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	bin, ok := ast.(BinaryExpr)
	if !ok || bin.Op != "*" {
		t.Errorf("Expected BinaryExpr with op '*', got %v", ast)
	}
	right, ok := bin.Right.(UnaryExpr)
	if !ok || right.Op != "-" {
		t.Errorf("Expected right UnaryExpr with op '-', got %v", bin.Right)
	}
}

func TestParseEmptyTokenList(t *testing.T) {
	_, err := Parse([]Token{})
	if err == nil {
		t.Fatal("Expected error for empty token list")
	}
	if !strings.Contains(err.Error(), "Unexpected end of input") {
		t.Errorf("Expected 'Unexpected end of input' error, got: %v", err)
	}
}

func TestParseUnmatchedLeftParen(t *testing.T) {
	_, err := p("(2 + 3")
	if err == nil {
		t.Fatal("Expected error for unmatched left paren")
	}
	if !strings.Contains(err.Error(), "Expected rparen") {
		t.Errorf("Expected 'Expected rparen' error, got: %v", err)
	}
}

func TestParseUnmatchedRightParen(t *testing.T) {
	_, err := p("2 + 3)")
	if err == nil {
		t.Fatal("Expected error for unmatched right paren")
	}
	if !strings.Contains(err.Error(), "Unexpected token after expression") {
		t.Errorf("Expected 'Unexpected token after expression' error, got: %v", err)
	}
}

func TestParseUnexpectedOperatorAtStart(t *testing.T) {
	_, err := p("* 5")
	if err == nil {
		t.Fatal("Expected error for unexpected operator at start")
	}
	if !strings.Contains(err.Error(), "Unexpected token: star") {
		t.Errorf("Expected 'Unexpected token: star' error, got: %v", err)
	}
}

func TestParseTrailingOperator(t *testing.T) {
	_, err := p("2 +")
	if err == nil {
		t.Fatal("Expected error for trailing operator")
	}
	if !strings.Contains(err.Error(), "Unexpected end of input") {
		t.Errorf("Expected 'Unexpected end of input' error, got: %v", err)
	}
}

// ====================
// evaluator tests
// ====================

func TestEvaluateNumberLiteral(t *testing.T) {
	result, err := Evaluate(NewNumberLiteral(42))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 42 {
		t.Errorf("Expected 42, got %f", result)
	}
}

func TestEvaluateUnaryNegation(t *testing.T) {
	result, err := Evaluate(NewUnaryExpr("-", NewNumberLiteral(5)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != -5 {
		t.Errorf("Expected -5, got %f", result)
	}
}

func TestEvaluateAddition(t *testing.T) {
	result, err := Evaluate(NewBinaryExpr("+", NewNumberLiteral(2), NewNumberLiteral(3)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 5 {
		t.Errorf("Expected 5, got %f", result)
	}
}

func TestEvaluateSubtraction(t *testing.T) {
	result, err := Evaluate(NewBinaryExpr("-", NewNumberLiteral(10), NewNumberLiteral(4)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 6 {
		t.Errorf("Expected 6, got %f", result)
	}
}

func TestEvaluateMultiplication(t *testing.T) {
	result, err := Evaluate(NewBinaryExpr("*", NewNumberLiteral(3), NewNumberLiteral(7)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 21 {
		t.Errorf("Expected 21, got %f", result)
	}
}

func TestEvaluateDivision(t *testing.T) {
	result, err := Evaluate(NewBinaryExpr("/", NewNumberLiteral(10), NewNumberLiteral(4)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 2.5 {
		t.Errorf("Expected 2.5, got %f", result)
	}
}

func TestEvaluateModulo(t *testing.T) {
	result, err := Evaluate(NewBinaryExpr("%", NewNumberLiteral(10), NewNumberLiteral(3)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 1 {
		t.Errorf("Expected 1, got %f", result)
	}
}

func TestEvaluatePower(t *testing.T) {
	result, err := Evaluate(NewBinaryExpr("**", NewNumberLiteral(2), NewNumberLiteral(10)))
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != 1024 {
		t.Errorf("Expected 1024, got %f", result)
	}
}

func TestEvaluateDivisionByZeroThrows(t *testing.T) {
	_, err := Evaluate(NewBinaryExpr("/", NewNumberLiteral(1), NewNumberLiteral(0)))
	if err == nil {
		t.Fatal("Expected error for division by zero")
	}
	if !strings.Contains(err.Error(), "Division by zero") {
		t.Errorf("Expected 'Division by zero' error, got: %v", err)
	}
}

func TestEvaluateModuloByZeroThrows(t *testing.T) {
	_, err := Evaluate(NewBinaryExpr("%", NewNumberLiteral(1), NewNumberLiteral(0)))
	if err == nil {
		t.Fatal("Expected error for modulo by zero")
	}
	if !strings.Contains(err.Error(), "Modulo by zero") {
		t.Errorf("Expected 'Modulo by zero' error, got: %v", err)
	}
}

func TestEvaluateNestedExpression(t *testing.T) {
	// (2 + 3) * -4
	expr := NewBinaryExpr("*",
		NewBinaryExpr("+", NewNumberLiteral(2), NewNumberLiteral(3)),
		NewUnaryExpr("-", NewNumberLiteral(4)))
	result, err := Evaluate(expr)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if result != -20 {
		t.Errorf("Expected -20, got %f", result)
	}
}

// ====================
// calc (end-to-end) tests
// ====================

func TestCalcBasicArithmetic(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"1 + 2", 3},
		{"10 - 3", 7},
		{"4 * 5", 20},
		{"15 / 4", 3.75},
		{"10 % 3", 1},
		{"2 ** 8", 256},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcPrecedence(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"2 + 3 * 4", 14},
		{"2 * 3 + 4", 10},
		{"10 - 2 * 3", 4},
		{"2 + 3 ** 2", 11},
		{"2 * 3 ** 2", 18},
		{"2 ** 3 * 4", 32},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcParentheses(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"(2 + 3) * 4", 20},
		{"2 * (3 + 4)", 14},
		{"(2 + 3) * (4 + 5)", 45},
		{"((1 + 2) * (3 + 4))", 21},
		{"(10)", 10},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcAssociativity(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"1 - 2 - 3", -4},
		{"1 - 2 + 3", 2},
		{"12 / 3 / 2", 2},
		{"2 ** 3 ** 2", 512},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcUnaryMinus(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"-5", -5},
		{"--5", 5},
		{"-(-5)", 5},
		{"2 * -3", -6},
		{"-2 ** 2", 4},
		{"-(2 ** 2)", -4},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcDecimals(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"0.1 + 0.2", 0.1 + 0.2},
		{"3.14 * 2", 6.28},
		{".5 + .5", 1},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcComplexExpressions(t *testing.T) {
	tests := []struct {
		expr     string
		expected float64
	}{
		{"2 + 3 * 4 - 1", 13},
		{"(2 + 3) * (4 - 1) / 5", 3},
		{"10 % 3 + 2 ** 3", 9},
		{"2 ** (1 + 2)", 8},
		{"100 / 10 / 2 + 3", 8},
	}

	for _, tt := range tests {
		result, err := Calc(tt.expr)
		if err != nil {
			t.Fatalf("Calc(%q) error: %v", tt.expr, err)
		}
		if !floatEquals(result, tt.expected) {
			t.Errorf("Calc(%q) = %f, expected %f", tt.expr, result, tt.expected)
		}
	}
}

func TestCalcErrors(t *testing.T) {
	tests := []struct {
		expr        string
		errorSubstr string
	}{
		{"", "Empty expression"},
		{"   ", "Empty expression"},
		{"1 / 0", "Division by zero"},
		{"5 % 0", "Modulo by zero"},
		{"(2 + 3", "Expected rparen"},
		{"2 @ 3", "Unexpected character"},
		{"2 +", "Unexpected end of input"},
	}

	for _, tt := range tests {
		_, err := Calc(tt.expr)
		if err == nil {
			t.Fatalf("Calc(%q) expected error, got nil", tt.expr)
		}
		if !strings.Contains(err.Error(), tt.errorSubstr) {
			t.Errorf("Calc(%q) error = %v, expected to contain %q", tt.expr, err, tt.errorSubstr)
		}
	}
}
