package main

import (
	"math"
	"strings"
	"testing"
)

// ============================================================================
// token-types tests
// ============================================================================

func TestTokenCreation(t *testing.T) {
	tests := []struct {
		name     string
		kind     TokenKind
		value    string
		expected Token
	}{
		{
			name: "number token",
			kind: TokenNumber,
			value: "42",
			expected: Token{TokenNumber, "42"},
		},
		{
			name: "plus token",
			kind: TokenPlus,
			value: "+",
			expected: Token{TokenPlus, "+"},
		},
		{
			name: "minus token",
			kind: TokenMinus,
			value: "-",
			expected: Token{TokenMinus, "-"},
		},
		{
			name: "star token",
			kind: TokenStar,
			value: "*",
			expected: Token{TokenStar, "*"},
		},
		{
			name: "slash token",
			kind: TokenSlash,
			value: "/",
			expected: Token{TokenSlash, "/"},
		},
		{
			name: "percent token",
			kind: TokenPercent,
			value: "%",
			expected: Token{TokenPercent, "%"},
		},
		{
			name: "power token",
			kind: TokenPower,
			value: "**",
			expected: Token{TokenPower, "**"},
		},
		{
			name: "lparen token",
			kind: TokenLParen,
			value: "(",
			expected: Token{TokenLParen, "("},
		},
		{
			name: "rparen token",
			kind: TokenRParen,
			value: ")",
			expected: Token{TokenRParen, ")"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := Token{tt.kind, tt.value}
			if token != tt.expected {
				t.Errorf("got %+v, want %+v", token, tt.expected)
			}
		})
	}
}

// ============================================================================
// ast-types tests
// ============================================================================

func TestNumberLiteral(t *testing.T) {
	n := &NumberLiteral{42}
	if n.Value != 42 {
		t.Errorf("got %v, want 42", n.Value)
	}
}

func TestUnaryExpr(t *testing.T) {
	operand := &NumberLiteral{5}
	u := &UnaryExpr{OpNeg, operand}
	if u.Op != OpNeg {
		t.Errorf("got %v, want %v", u.Op, OpNeg)
	}
	if lit, ok := u.Operand.(*NumberLiteral); !ok || lit.Value != 5 {
		t.Errorf("operand mismatch")
	}
}

func TestBinaryExpr(t *testing.T) {
	left := &NumberLiteral{2}
	right := &NumberLiteral{3}
	b := &BinaryExpr{OpAdd, left, right}
	if b.Op != OpAdd {
		t.Errorf("got %v, want %v", b.Op, OpAdd)
	}
}

// ============================================================================
// tokenizer tests
// ============================================================================

func TestTokenizeEmpty(t *testing.T) {
	tokens, err := Tokenize("")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 0 {
		t.Errorf("got %d tokens, want 0", len(tokens))
	}
}

func TestTokenizeWhitespaceOnly(t *testing.T) {
	tokens, err := Tokenize("   \t\n\r  ")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 0 {
		t.Errorf("got %d tokens, want 0", len(tokens))
	}
}

func TestTokenizeSingleInteger(t *testing.T) {
	tokens, err := Tokenize("42")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 1 || tokens[0].Kind != TokenNumber || tokens[0].Value != "42" {
		t.Errorf("unexpected token: %+v", tokens)
	}
}

func TestTokenizeDecimal(t *testing.T) {
	tokens, err := Tokenize("3.14")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 1 || tokens[0].Value != "3.14" {
		t.Errorf("unexpected token: %+v", tokens)
	}
}

func TestTokenizeDotNumber(t *testing.T) {
	tokens, err := Tokenize(".5")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 1 || tokens[0].Value != ".5" {
		t.Errorf("unexpected token: %+v", tokens)
	}
}

func TestTokenizeAllOperators(t *testing.T) {
	tokens, err := Tokenize("+ - * / % **")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	expected := []TokenKind{TokenPlus, TokenMinus, TokenStar, TokenSlash, TokenPercent, TokenPower}
	if len(tokens) != len(expected) {
		t.Errorf("got %d tokens, want %d", len(tokens), len(expected))
	}
	for i, k := range expected {
		if tokens[i].Kind != k {
			t.Errorf("token %d: got %v, want %v", i, tokens[i].Kind, k)
		}
	}
}

func TestTokenizeParentheses(t *testing.T) {
	tokens, err := Tokenize("(1)")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 3 {
		t.Errorf("got %d tokens, want 3", len(tokens))
	}
	if tokens[0].Kind != TokenLParen || tokens[1].Kind != TokenNumber || tokens[2].Kind != TokenRParen {
		t.Errorf("unexpected tokens: %+v", tokens)
	}
}

func TestTokenizeComplexExpression(t *testing.T) {
	tokens, err := Tokenize("2 + 3 * (4 - 1)")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(tokens) != 9 {
		t.Errorf("got %d tokens, want 9", len(tokens))
	}
}

func TestTokenizePowerVsMultiply(t *testing.T) {
	tokens, err := Tokenize("2**3*4")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	expected := []TokenKind{TokenNumber, TokenPower, TokenNumber, TokenStar, TokenNumber}
	if len(tokens) != len(expected) {
		t.Errorf("got %d tokens, want %d", len(tokens), len(expected))
	}
	for i, k := range expected {
		if tokens[i].Kind != k {
			t.Errorf("token %d: got %v, want %v", i, tokens[i].Kind, k)
		}
	}
}

func TestTokenizeNoWhitespace(t *testing.T) {
	tokens, err := Tokenize("1+2")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	expected := []TokenKind{TokenNumber, TokenPlus, TokenNumber}
	if len(tokens) != len(expected) {
		t.Errorf("got %d tokens, want %d", len(tokens), len(expected))
	}
}

func TestTokenizeDoubleDotError(t *testing.T) {
	_, err := Tokenize("1.2.3")
	if err == nil {
		t.Errorf("expected error for multiple dots")
	}
	if !strings.Contains(err.Error(), "Unexpected character '.'") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestTokenizeUnrecognizedCharacter(t *testing.T) {
	_, err := Tokenize("2 @ 3")
	if err == nil {
		t.Errorf("expected error for '@'")
	}
	if !strings.Contains(err.Error(), "Unexpected character '@'") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestTokenizeUnrecognizedCharacterPosition(t *testing.T) {
	_, err := Tokenize("2 @ 3")
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "position") {
		t.Errorf("error should mention position: %v", err)
	}
}

// ============================================================================
// parser tests
// ============================================================================

func p(t *testing.T, input string) AstNode {
	tokens, err := Tokenize(input)
	if err != nil {
		t.Fatalf("tokenize failed: %v", err)
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	return ast
}

func TestParseSingleNumber(t *testing.T) {
	ast := p(t, "42")
	lit, ok := ast.(*NumberLiteral)
	if !ok || lit.Value != 42 {
		t.Errorf("expected number 42, got %+v", ast)
	}
}

func TestParseDecimalNumber(t *testing.T) {
	ast := p(t, "3.14")
	lit, ok := ast.(*NumberLiteral)
	if !ok || lit.Value != 3.14 {
		t.Errorf("expected 3.14, got %+v", ast)
	}
}

func TestParseParenthesizedNumber(t *testing.T) {
	ast := p(t, "(42)")
	lit, ok := ast.(*NumberLiteral)
	if !ok || lit.Value != 42 {
		t.Errorf("expected 42, got %+v", ast)
	}
}

func TestParseNestedParentheses(t *testing.T) {
	ast := p(t, "((7))")
	lit, ok := ast.(*NumberLiteral)
	if !ok || lit.Value != 7 {
		t.Errorf("expected 7, got %+v", ast)
	}
}

func TestParseAddition(t *testing.T) {
	ast := p(t, "2 + 3")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpAdd {
		t.Errorf("expected addition, got %+v", ast)
	}
}

func TestParseSubtraction(t *testing.T) {
	ast := p(t, "5 - 1")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpSub {
		t.Errorf("expected subtraction, got %+v", ast)
	}
}

func TestParseMultiplication(t *testing.T) {
	ast := p(t, "4 * 6")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpMul {
		t.Errorf("expected multiplication, got %+v", ast)
	}
}

func TestParseDivision(t *testing.T) {
	ast := p(t, "10 / 2")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpDiv {
		t.Errorf("expected division, got %+v", ast)
	}
}

func TestParseModulo(t *testing.T) {
	ast := p(t, "10 % 3")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpMod {
		t.Errorf("expected modulo, got %+v", ast)
	}
}

func TestParsePower(t *testing.T) {
	ast := p(t, "2 ** 3")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpPower {
		t.Errorf("expected power, got %+v", ast)
	}
}

func TestParsePrecedenceMulBeforeAdd(t *testing.T) {
	ast := p(t, "2 + 3 * 4")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpAdd {
		t.Errorf("expected addition at top level, got %+v", ast)
	}
	// Left should be 2
	leftLit, ok := bin.Left.(*NumberLiteral)
	if !ok || leftLit.Value != 2 {
		t.Errorf("expected left to be 2, got %+v", bin.Left)
	}
	// Right should be 3 * 4
	rightBin, ok := bin.Right.(*BinaryExpr)
	if !ok || rightBin.Op != OpMul {
		t.Errorf("expected right to be multiplication, got %+v", bin.Right)
	}
}

func TestParsePrecedencePowerBeforeMul(t *testing.T) {
	ast := p(t, "2 * 3 ** 2")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpMul {
		t.Errorf("expected multiplication at top level, got %+v", ast)
	}
	// Right should be 3 ** 2
	rightBin, ok := bin.Right.(*BinaryExpr)
	if !ok || rightBin.Op != OpPower {
		t.Errorf("expected right to be power, got %+v", bin.Right)
	}
}

func TestParseParensOverridePrecedence(t *testing.T) {
	ast := p(t, "(2 + 3) * 4")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpMul {
		t.Errorf("expected multiplication at top level, got %+v", ast)
	}
	// Left should be 2 + 3
	leftBin, ok := bin.Left.(*BinaryExpr)
	if !ok || leftBin.Op != OpAdd {
		t.Errorf("expected left to be addition, got %+v", bin.Left)
	}
}

func TestParseLeftAssociativeSub(t *testing.T) {
	ast := p(t, "1 - 2 - 3")
	// Should be (1 - 2) - 3
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpSub {
		t.Errorf("expected subtraction, got %+v", ast)
	}
	// Right should be 3
	rightLit, ok := bin.Right.(*NumberLiteral)
	if !ok || rightLit.Value != 3 {
		t.Errorf("expected right to be 3, got %+v", bin.Right)
	}
	// Left should be (1 - 2)
	leftBin, ok := bin.Left.(*BinaryExpr)
	if !ok || leftBin.Op != OpSub {
		t.Errorf("expected left to be subtraction, got %+v", bin.Left)
	}
}

func TestParseLeftAssociativeDiv(t *testing.T) {
	ast := p(t, "12 / 3 / 2")
	// Should be (12 / 3) / 2
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpDiv {
		t.Errorf("expected division, got %+v", ast)
	}
	// Left should be (12 / 3)
	leftBin, ok := bin.Left.(*BinaryExpr)
	if !ok || leftBin.Op != OpDiv {
		t.Errorf("expected left to be division, got %+v", bin.Left)
	}
}

func TestParseRightAssociativePower(t *testing.T) {
	ast := p(t, "2 ** 3 ** 2")
	// Should be 2 ** (3 ** 2)
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpPower {
		t.Errorf("expected power, got %+v", ast)
	}
	// Left should be 2
	leftLit, ok := bin.Left.(*NumberLiteral)
	if !ok || leftLit.Value != 2 {
		t.Errorf("expected left to be 2, got %+v", bin.Left)
	}
	// Right should be (3 ** 2)
	rightBin, ok := bin.Right.(*BinaryExpr)
	if !ok || rightBin.Op != OpPower {
		t.Errorf("expected right to be power, got %+v", bin.Right)
	}
}

func TestParseUnaryMinus(t *testing.T) {
	ast := p(t, "-5")
	un, ok := ast.(*UnaryExpr)
	if !ok || un.Op != OpNeg {
		t.Errorf("expected unary negation, got %+v", ast)
	}
}

func TestParseDoubleUnaryMinus(t *testing.T) {
	ast := p(t, "--5")
	un, ok := ast.(*UnaryExpr)
	if !ok || un.Op != OpNeg {
		t.Errorf("expected outer unary negation, got %+v", ast)
	}
	innerUn, ok := un.Operand.(*UnaryExpr)
	if !ok || innerUn.Op != OpNeg {
		t.Errorf("expected inner unary negation, got %+v", un.Operand)
	}
}

func TestParseUnaryInExpression(t *testing.T) {
	ast := p(t, "2 * -3")
	bin, ok := ast.(*BinaryExpr)
	if !ok || bin.Op != OpMul {
		t.Errorf("expected multiplication, got %+v", ast)
	}
	// Right should be unary
	rightUn, ok := bin.Right.(*UnaryExpr)
	if !ok {
		t.Errorf("expected unary on right, got %+v", bin.Right)
	}
	if rightUn.Op != OpNeg {
		t.Errorf("expected negation, got %v", rightUn.Op)
	}
}

func TestParseErrorEmptyTokenList(t *testing.T) {
	_, err := Parse([]Token{})
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "Unexpected end of input") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestParseErrorUnmatchedLeftParen(t *testing.T) {
	_, err := Parse(mustTokenize("(2 + 3"))
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "rparen") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestParseErrorUnmatchedRightParen(t *testing.T) {
	_, err := Parse(mustTokenize("2 + 3)"))
	if err == nil {
		t.Errorf("expected error")
	}
}

func TestParseErrorUnexpectedOperator(t *testing.T) {
	_, err := Parse(mustTokenize("* 5"))
	if err == nil {
		t.Errorf("expected error")
	}
}

func TestParseErrorTrailingOperator(t *testing.T) {
	_, err := Parse(mustTokenize("2 +"))
	if err == nil {
		t.Errorf("expected error")
	}
}

// ============================================================================
// evaluator tests
// ============================================================================

func TestEvaluateNumberLiteral(t *testing.T) {
	result, err := Evaluate(&NumberLiteral{42})
	if err != nil || result != 42 {
		t.Errorf("expected 42, got %v (err: %v)", result, err)
	}
}

func TestEvaluateUnaryNegation(t *testing.T) {
	result, err := Evaluate(&UnaryExpr{OpNeg, &NumberLiteral{5}})
	if err != nil || result != -5 {
		t.Errorf("expected -5, got %v (err: %v)", result, err)
	}
}

func TestEvaluateAddition(t *testing.T) {
	expr := &BinaryExpr{OpAdd, &NumberLiteral{2}, &NumberLiteral{3}}
	result, err := Evaluate(expr)
	if err != nil || result != 5 {
		t.Errorf("expected 5, got %v (err: %v)", result, err)
	}
}

func TestEvaluateSubtraction(t *testing.T) {
	expr := &BinaryExpr{OpSub, &NumberLiteral{10}, &NumberLiteral{4}}
	result, err := Evaluate(expr)
	if err != nil || result != 6 {
		t.Errorf("expected 6, got %v (err: %v)", result, err)
	}
}

func TestEvaluateMultiplication(t *testing.T) {
	expr := &BinaryExpr{OpMul, &NumberLiteral{3}, &NumberLiteral{7}}
	result, err := Evaluate(expr)
	if err != nil || result != 21 {
		t.Errorf("expected 21, got %v (err: %v)", result, err)
	}
}

func TestEvaluateDivision(t *testing.T) {
	expr := &BinaryExpr{OpDiv, &NumberLiteral{10}, &NumberLiteral{4}}
	result, err := Evaluate(expr)
	if err != nil || result != 2.5 {
		t.Errorf("expected 2.5, got %v (err: %v)", result, err)
	}
}

func TestEvaluateModulo(t *testing.T) {
	expr := &BinaryExpr{OpMod, &NumberLiteral{10}, &NumberLiteral{3}}
	result, err := Evaluate(expr)
	if err != nil || result != 1 {
		t.Errorf("expected 1, got %v (err: %v)", result, err)
	}
}

func TestEvaluatePower(t *testing.T) {
	expr := &BinaryExpr{OpPower, &NumberLiteral{2}, &NumberLiteral{10}}
	result, err := Evaluate(expr)
	if err != nil || result != 1024 {
		t.Errorf("expected 1024, got %v (err: %v)", result, err)
	}
}

func TestEvaluateDivisionByZero(t *testing.T) {
	expr := &BinaryExpr{OpDiv, &NumberLiteral{1}, &NumberLiteral{0}}
	_, err := Evaluate(expr)
	if err == nil {
		t.Errorf("expected error for division by zero")
	}
	if !strings.Contains(err.Error(), "Division by zero") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestEvaluateModuloByZero(t *testing.T) {
	expr := &BinaryExpr{OpMod, &NumberLiteral{1}, &NumberLiteral{0}}
	_, err := Evaluate(expr)
	if err == nil {
		t.Errorf("expected error for modulo by zero")
	}
	if !strings.Contains(err.Error(), "Modulo by zero") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestEvaluateNestedExpression(t *testing.T) {
	// (2 + 3) * -4 = -20
	expr := &BinaryExpr{
		OpMul,
		&BinaryExpr{OpAdd, &NumberLiteral{2}, &NumberLiteral{3}},
		&UnaryExpr{OpNeg, &NumberLiteral{4}},
	}
	result, err := Evaluate(expr)
	if err != nil || result != -20 {
		t.Errorf("expected -20, got %v (err: %v)", result, err)
	}
}

// ============================================================================
// calc (end-to-end) tests
// ============================================================================

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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !almostEqual(result, tt.expected) {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
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
		t.Run(tt.expr, func(t *testing.T) {
			result, err := Calc(tt.expr)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !almostEqual(result, tt.expected) {
				t.Errorf("got %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestCalcErrorEmpty(t *testing.T) {
	_, err := Calc("")
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "Empty expression") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestCalcErrorWhitespaceOnly(t *testing.T) {
	_, err := Calc("   ")
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "Empty expression") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestCalcErrorDivisionByZero(t *testing.T) {
	_, err := Calc("1 / 0")
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "Division by zero") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestCalcErrorModuloByZero(t *testing.T) {
	_, err := Calc("5 % 0")
	if err == nil {
		t.Errorf("expected error")
	}
	if !strings.Contains(err.Error(), "Modulo by zero") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestCalcErrorUnmatchedParen(t *testing.T) {
	_, err := Calc("(2 + 3")
	if err == nil {
		t.Errorf("expected error")
	}
}

func TestCalcErrorInvalidCharacter(t *testing.T) {
	_, err := Calc("2 @ 3")
	if err == nil {
		t.Errorf("expected error")
	}
}

func TestCalcErrorTrailingOperator(t *testing.T) {
	_, err := Calc("2 +")
	if err == nil {
		t.Errorf("expected error")
	}
}

// ============================================================================
// Helper functions
// ============================================================================

func mustTokenize(input string) []Token {
	tokens, err := Tokenize(input)
	if err != nil {
		panic(err)
	}
	return tokens
}

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}
