package main

import (
	"math"
	"testing"
)

// Tokenizer Tests
func TestTokenizeEmpty(t *testing.T) {
	tokens, err := Tokenize("")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens, got %d", len(tokens))
	}
}

func TestTokenizeWhitespace(t *testing.T) {
	tokens, err := Tokenize("   \t\n  ")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens, got %d", len(tokens))
	}
}

func TestTokenizeNumber(t *testing.T) {
	tokens, err := Tokenize("42")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(tokens) != 1 {
		t.Errorf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].Kind != TokenNumber || tokens[0].Value != "42" {
		t.Errorf("expected number:42, got %s:%s", tokens[0].Kind, tokens[0].Value)
	}
}

func TestTokenizeDecimal(t *testing.T) {
	tokens, err := Tokenize("3.14")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(tokens) != 1 {
		t.Errorf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].Kind != TokenNumber || tokens[0].Value != "3.14" {
		t.Errorf("expected number:3.14, got %s:%s", tokens[0].Kind, tokens[0].Value)
	}
}

func TestTokenizeLeadingDecimal(t *testing.T) {
	tokens, err := Tokenize(".5")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(tokens) != 1 {
		t.Errorf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].Kind != TokenNumber || tokens[0].Value != ".5" {
		t.Errorf("expected number:.5, got %s:%s", tokens[0].Kind, tokens[0].Value)
	}
}

func TestTokenizeOperators(t *testing.T) {
	tokens, err := Tokenize("+ - * / % **")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	expected := []struct {
		kind  string
		value string
	}{
		{TokenPlus, "+"},
		{TokenMinus, "-"},
		{TokenStar, "*"},
		{TokenSlash, "/"},
		{TokenPercent, "%"},
		{TokenPower, "**"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Kind != exp.kind || tokens[i].Value != exp.value {
			t.Errorf("token %d: expected %s:%s, got %s:%s", i, exp.kind, exp.value, tokens[i].Kind, tokens[i].Value)
		}
	}
}

func TestTokenizeParens(t *testing.T) {
	tokens, err := Tokenize("(1)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	expected := []struct {
		kind  string
		value string
	}{
		{TokenLParen, "("},
		{TokenNumber, "1"},
		{TokenRParen, ")"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Kind != exp.kind || tokens[i].Value != exp.value {
			t.Errorf("token %d: expected %s:%s, got %s:%s", i, exp.kind, exp.value, tokens[i].Kind, tokens[i].Value)
		}
	}
}

func TestTokenizeComplex(t *testing.T) {
	tokens, err := Tokenize("2 + 3 * (4 - 1)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	expected := []struct {
		kind  string
		value string
	}{
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
		t.Errorf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Kind != exp.kind || tokens[i].Value != exp.value {
			t.Errorf("token %d: expected %s:%s, got %s:%s", i, exp.kind, exp.value, tokens[i].Kind, tokens[i].Value)
		}
	}
}

func TestTokenizePower(t *testing.T) {
	tokens, err := Tokenize("2**3*4")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	expected := []struct {
		kind  string
		value string
	}{
		{TokenNumber, "2"},
		{TokenPower, "**"},
		{TokenNumber, "3"},
		{TokenStar, "*"},
		{TokenNumber, "4"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Kind != exp.kind || tokens[i].Value != exp.value {
			t.Errorf("token %d: expected %s:%s, got %s:%s", i, exp.kind, exp.value, tokens[i].Kind, tokens[i].Value)
		}
	}
}

func TestTokenizeNoSpaces(t *testing.T) {
	tokens, err := Tokenize("1+2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	expected := []struct {
		kind  string
		value string
	}{
		{TokenNumber, "1"},
		{TokenPlus, "+"},
		{TokenNumber, "2"},
	}
	if len(tokens) != len(expected) {
		t.Errorf("expected %d tokens, got %d", len(expected), len(tokens))
	}
	for i, exp := range expected {
		if tokens[i].Kind != exp.kind || tokens[i].Value != exp.value {
			t.Errorf("token %d: expected %s:%s, got %s:%s", i, exp.kind, exp.value, tokens[i].Kind, tokens[i].Value)
		}
	}
}

func TestTokenizeDoubleDot(t *testing.T) {
	_, err := Tokenize("1.2.3")
	if err == nil {
		t.Errorf("expected error for double decimal point")
	}
}

func TestTokenizeInvalidChar(t *testing.T) {
	_, err := Tokenize("2 @ 3")
	if err == nil {
		t.Errorf("expected error for invalid character")
	}
}

// Parser Tests
func TestParseNumber(t *testing.T) {
	tokens := []Token{{Kind: TokenNumber, Value: "42"}}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	nl, ok := ast.(*NumberLiteral)
	if !ok {
		t.Errorf("expected NumberLiteral, got %T", ast)
	}
	if nl.Value != 42 {
		t.Errorf("expected 42, got %f", nl.Value)
	}
}

func TestParseDecimal(t *testing.T) {
	tokens := []Token{{Kind: TokenNumber, Value: "3.14"}}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	nl, ok := ast.(*NumberLiteral)
	if !ok {
		t.Errorf("expected NumberLiteral, got %T", ast)
	}
	if nl.Value != 3.14 {
		t.Errorf("expected 3.14, got %f", nl.Value)
	}
}

func TestParseParens(t *testing.T) {
	tokens := []Token{
		{Kind: TokenLParen, Value: "("},
		{Kind: TokenNumber, Value: "42"},
		{Kind: TokenRParen, Value: ")"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	nl, ok := ast.(*NumberLiteral)
	if !ok {
		t.Errorf("expected NumberLiteral, got %T", ast)
	}
	if nl.Value != 42 {
		t.Errorf("expected 42, got %f", nl.Value)
	}
}

func TestParseDoubleParens(t *testing.T) {
	tokens := []Token{
		{Kind: TokenLParen, Value: "("},
		{Kind: TokenLParen, Value: "("},
		{Kind: TokenNumber, Value: "7"},
		{Kind: TokenRParen, Value: ")"},
		{Kind: TokenRParen, Value: ")"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	nl, ok := ast.(*NumberLiteral)
	if !ok {
		t.Errorf("expected NumberLiteral, got %T", ast)
	}
	if nl.Value != 7 {
		t.Errorf("expected 7, got %f", nl.Value)
	}
}

func TestParseBinaryPlus(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPlus, Value: "+"},
		{Kind: TokenNumber, Value: "3"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	if be.Op != "+" {
		t.Errorf("expected +, got %s", be.Op)
	}
}

func TestParseBinaryMinus(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "5"},
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenNumber, Value: "1"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	if be.Op != "-" {
		t.Errorf("expected -, got %s", be.Op)
	}
}

func TestParseBinaryStar(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "4"},
		{Kind: TokenStar, Value: "*"},
		{Kind: TokenNumber, Value: "6"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	if be.Op != "*" {
		t.Errorf("expected *, got %s", be.Op)
	}
}

func TestParseBinarySlash(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "10"},
		{Kind: TokenSlash, Value: "/"},
		{Kind: TokenNumber, Value: "2"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	if be.Op != "/" {
		t.Errorf("expected /, got %s", be.Op)
	}
}

func TestParseBinaryPercent(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "10"},
		{Kind: TokenPercent, Value: "%"},
		{Kind: TokenNumber, Value: "3"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	if be.Op != "%" {
		t.Errorf("expected %%, got %s", be.Op)
	}
}

func TestParseBinaryPower(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPower, Value: "**"},
		{Kind: TokenNumber, Value: "3"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	if be.Op != "**" {
		t.Errorf("expected **, got %s", be.Op)
	}
}

func TestParsePrecedencePlusTimes(t *testing.T) {
	// "2 + 3 * 4" should parse as binary(+, number(2), binary(*, number(3), number(4)))
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPlus, Value: "+"},
		{Kind: TokenNumber, Value: "3"},
		{Kind: TokenStar, Value: "*"},
		{Kind: TokenNumber, Value: "4"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr at top, got %T", ast)
	}
	if be.Op != "+" {
		t.Errorf("expected + at top, got %s", be.Op)
	}
	_, ok = be.Right.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr on right, got %T", be.Right)
	}
}

func TestParsePrecedenceTimesPower(t *testing.T) {
	// "2 * 3 ** 2" should parse as binary(*, number(2), binary(**, number(3), number(2)))
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenStar, Value: "*"},
		{Kind: TokenNumber, Value: "3"},
		{Kind: TokenPower, Value: "**"},
		{Kind: TokenNumber, Value: "2"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr at top, got %T", ast)
	}
	if be.Op != "*" {
		t.Errorf("expected * at top, got %s", be.Op)
	}
	_, ok = be.Right.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr on right, got %T", be.Right)
	}
}

func TestParsePrecedenceParens(t *testing.T) {
	// "(2 + 3) * 4" should parse as binary(*, binary(+, number(2), number(3)), number(4))
	tokens := []Token{
		{Kind: TokenLParen, Value: "("},
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPlus, Value: "+"},
		{Kind: TokenNumber, Value: "3"},
		{Kind: TokenRParen, Value: ")"},
		{Kind: TokenStar, Value: "*"},
		{Kind: TokenNumber, Value: "4"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr at top, got %T", ast)
	}
	if be.Op != "*" {
		t.Errorf("expected * at top, got %s", be.Op)
	}
	_, ok = be.Left.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr on left, got %T", be.Left)
	}
}

func TestParseAssociativityMinus(t *testing.T) {
	// "1 - 2 - 3" should parse as binary(-, binary(-, number(1), number(2)), number(3))
	tokens := []Token{
		{Kind: TokenNumber, Value: "1"},
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenNumber, Value: "3"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr at top, got %T", ast)
	}
	if be.Op != "-" {
		t.Errorf("expected - at top, got %s", be.Op)
	}
	_, ok = be.Left.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr on left, got %T", be.Left)
	}
}

func TestParseAssociativityDivide(t *testing.T) {
	// "12 / 3 / 2" should parse as binary(/, binary(/, number(12), number(3)), number(2))
	tokens := []Token{
		{Kind: TokenNumber, Value: "12"},
		{Kind: TokenSlash, Value: "/"},
		{Kind: TokenNumber, Value: "3"},
		{Kind: TokenSlash, Value: "/"},
		{Kind: TokenNumber, Value: "2"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr at top, got %T", ast)
	}
	if be.Op != "/" {
		t.Errorf("expected / at top, got %s", be.Op)
	}
	_, ok = be.Left.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr on left, got %T", be.Left)
	}
}

func TestParseAssociativityPower(t *testing.T) {
	// "2 ** 3 ** 2" should parse as binary(**, number(2), binary(**, number(3), number(2)))
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPower, Value: "**"},
		{Kind: TokenNumber, Value: "3"},
		{Kind: TokenPower, Value: "**"},
		{Kind: TokenNumber, Value: "2"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr at top, got %T", ast)
	}
	if be.Op != "**" {
		t.Errorf("expected ** at top, got %s", be.Op)
	}
	_, ok = be.Right.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr on right, got %T", be.Right)
	}
}

func TestParseUnaryMinus(t *testing.T) {
	tokens := []Token{
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenNumber, Value: "5"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	ue, ok := ast.(*UnaryExpr)
	if !ok {
		t.Errorf("expected UnaryExpr, got %T", ast)
	}
	if ue.Op != "-" {
		t.Errorf("expected -, got %s", ue.Op)
	}
}

func TestParseDoubleUnaryMinus(t *testing.T) {
	// "--5" should parse as unary(-, unary(-, number(5)))
	tokens := []Token{
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenNumber, Value: "5"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	ue, ok := ast.(*UnaryExpr)
	if !ok {
		t.Errorf("expected UnaryExpr at top, got %T", ast)
	}
	if ue.Op != "-" {
		t.Errorf("expected - at top, got %s", ue.Op)
	}
	_, ok = ue.Operand.(*UnaryExpr)
	if !ok {
		t.Errorf("expected UnaryExpr inside, got %T", ue.Operand)
	}
}

func TestParseUnaryInBinary(t *testing.T) {
	// "2 * -3" should parse as binary(*, number(2), unary(-, number(3)))
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenStar, Value: "*"},
		{Kind: TokenMinus, Value: "-"},
		{Kind: TokenNumber, Value: "3"},
	}
	ast, err := Parse(tokens)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	be, ok := ast.(*BinaryExpr)
	if !ok {
		t.Errorf("expected BinaryExpr, got %T", ast)
	}
	_, ok = be.Right.(*UnaryExpr)
	if !ok {
		t.Errorf("expected UnaryExpr on right, got %T", be.Right)
	}
}

func TestParseEmptyInput(t *testing.T) {
	_, err := Parse([]Token{})
	if err == nil {
		t.Errorf("expected error for empty input")
	}
}

func TestParseUnmatchedParen(t *testing.T) {
	tokens := []Token{
		{Kind: TokenLParen, Value: "("},
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPlus, Value: "+"},
		{Kind: TokenNumber, Value: "3"},
	}
	_, err := Parse(tokens)
	if err == nil {
		t.Errorf("expected error for unmatched paren")
	}
}

func TestParseTrailingToken(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPlus, Value: "+"},
		{Kind: TokenNumber, Value: "3"},
		{Kind: TokenRParen, Value: ")"},
	}
	_, err := Parse(tokens)
	if err == nil {
		t.Errorf("expected error for trailing token")
	}
}

func TestParseUnexpectedStar(t *testing.T) {
	tokens := []Token{
		{Kind: TokenStar, Value: "*"},
		{Kind: TokenNumber, Value: "5"},
	}
	_, err := Parse(tokens)
	if err == nil {
		t.Errorf("expected error for unexpected star")
	}
}

func TestParseIncompleteExpression(t *testing.T) {
	tokens := []Token{
		{Kind: TokenNumber, Value: "2"},
		{Kind: TokenPlus, Value: "+"},
	}
	_, err := Parse(tokens)
	if err == nil {
		t.Errorf("expected error for incomplete expression")
	}
}

// Evaluator Tests
func TestEvaluateNumber(t *testing.T) {
	ast := &NumberLiteral{Value: 42}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 42 {
		t.Errorf("expected 42, got %f", result)
	}
}

func TestEvaluateDecimal(t *testing.T) {
	ast := &NumberLiteral{Value: 3.14}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 3.14 {
		t.Errorf("expected 3.14, got %f", result)
	}
}

func TestEvaluateUnaryMinus(t *testing.T) {
	// unary(-, number(5)) -> -5
	ast := &UnaryExpr{
		Op:      "-",
		Operand: &NumberLiteral{Value: 5},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != -5 {
		t.Errorf("expected -5, got %f", result)
	}
}

func TestEvaluateBinaryPlus(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "+",
		Left:  &NumberLiteral{Value: 2},
		Right: &NumberLiteral{Value: 3},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 5 {
		t.Errorf("expected 5, got %f", result)
	}
}

func TestEvaluateBinaryMinus(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "-",
		Left:  &NumberLiteral{Value: 10},
		Right: &NumberLiteral{Value: 4},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 6 {
		t.Errorf("expected 6, got %f", result)
	}
}

func TestEvaluateBinaryStar(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "*",
		Left:  &NumberLiteral{Value: 3},
		Right: &NumberLiteral{Value: 7},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 21 {
		t.Errorf("expected 21, got %f", result)
	}
}

func TestEvaluateBinarySlash(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "/",
		Left:  &NumberLiteral{Value: 10},
		Right: &NumberLiteral{Value: 4},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 2.5 {
		t.Errorf("expected 2.5, got %f", result)
	}
}

func TestEvaluateBinaryPercent(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "%",
		Left:  &NumberLiteral{Value: 10},
		Right: &NumberLiteral{Value: 3},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 1 {
		t.Errorf("expected 1, got %f", result)
	}
}

func TestEvaluateBinaryPower(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "**",
		Left:  &NumberLiteral{Value: 2},
		Right: &NumberLiteral{Value: 10},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 1024 {
		t.Errorf("expected 1024, got %f", result)
	}
}

func TestEvaluateDivideByZero(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "/",
		Left:  &NumberLiteral{Value: 1},
		Right: &NumberLiteral{Value: 0},
	}
	_, err := Evaluate(ast)
	if err == nil {
		t.Errorf("expected error for division by zero")
	}
}

func TestEvaluateModuloByZero(t *testing.T) {
	ast := &BinaryExpr{
		Op:    "%",
		Left:  &NumberLiteral{Value: 1},
		Right: &NumberLiteral{Value: 0},
	}
	_, err := Evaluate(ast)
	if err == nil {
		t.Errorf("expected error for modulo by zero")
	}
}

func TestEvaluateComplex(t *testing.T) {
	// binary(*, binary(+, number(2), number(3)), unary(-, number(4)))
	// = (2 + 3) * (-4) = 5 * -4 = -20
	ast := &BinaryExpr{
		Op: "*",
		Left: &BinaryExpr{
			Op:    "+",
			Left:  &NumberLiteral{Value: 2},
			Right: &NumberLiteral{Value: 3},
		},
		Right: &UnaryExpr{
			Op:      "-",
			Operand: &NumberLiteral{Value: 4},
		},
	}
	result, err := Evaluate(ast)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != -20 {
		t.Errorf("expected -20, got %f", result)
	}
}

// End-to-End Calc Tests
func TestCalcSimpleAdd(t *testing.T) {
	result, err := Calc("1 + 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 3 {
		t.Errorf("expected 3, got %f", result)
	}
}

func TestCalcSimpleSub(t *testing.T) {
	result, err := Calc("10 - 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 7 {
		t.Errorf("expected 7, got %f", result)
	}
}

func TestCalcSimpleMul(t *testing.T) {
	result, err := Calc("4 * 5")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 20 {
		t.Errorf("expected 20, got %f", result)
	}
}

func TestCalcSimpleDiv(t *testing.T) {
	result, err := Calc("15 / 4")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 3.75 {
		t.Errorf("expected 3.75, got %f", result)
	}
}

func TestCalcSimpleMod(t *testing.T) {
	result, err := Calc("10 % 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 1 {
		t.Errorf("expected 1, got %f", result)
	}
}

func TestCalcSimplePower(t *testing.T) {
	result, err := Calc("2 ** 8")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 256 {
		t.Errorf("expected 256, got %f", result)
	}
}

func TestCalcPrecedencePlusMul(t *testing.T) {
	result, err := Calc("2 + 3 * 4")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 14 {
		t.Errorf("expected 14, got %f", result)
	}
}

func TestCalcPrecedenceMulAdd(t *testing.T) {
	result, err := Calc("2 * 3 + 4")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 10 {
		t.Errorf("expected 10, got %f", result)
	}
}

func TestCalcPrecedenceSubMul(t *testing.T) {
	result, err := Calc("10 - 2 * 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 4 {
		t.Errorf("expected 4, got %f", result)
	}
}

func TestCalcPrecedenceAddPower(t *testing.T) {
	result, err := Calc("2 + 3 ** 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 11 {
		t.Errorf("expected 11, got %f", result)
	}
}

func TestCalcPrecedenceMulPower(t *testing.T) {
	result, err := Calc("2 * 3 ** 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 18 {
		t.Errorf("expected 18, got %f", result)
	}
}

func TestCalcPrecedencePowerMul(t *testing.T) {
	result, err := Calc("2 ** 3 * 4")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 32 {
		t.Errorf("expected 32, got %f", result)
	}
}

func TestCalcParensChangeOrder(t *testing.T) {
	result, err := Calc("(2 + 3) * 4")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 20 {
		t.Errorf("expected 20, got %f", result)
	}
}

func TestCalcParensChangeOrder2(t *testing.T) {
	result, err := Calc("2 * (3 + 4)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 14 {
		t.Errorf("expected 14, got %f", result)
	}
}

func TestCalcMultipleParens(t *testing.T) {
	result, err := Calc("(2 + 3) * (4 + 5)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 45 {
		t.Errorf("expected 45, got %f", result)
	}
}

func TestCalcNestedParens(t *testing.T) {
	result, err := Calc("((1 + 2) * (3 + 4))")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 21 {
		t.Errorf("expected 21, got %f", result)
	}
}

func TestCalcSingleParens(t *testing.T) {
	result, err := Calc("(10)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 10 {
		t.Errorf("expected 10, got %f", result)
	}
}

func TestCalcAssociativitySub(t *testing.T) {
	result, err := Calc("1 - 2 - 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != -4 {
		t.Errorf("expected -4, got %f", result)
	}
}

func TestCalcAssociativitySubAdd(t *testing.T) {
	result, err := Calc("1 - 2 + 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 2 {
		t.Errorf("expected 2, got %f", result)
	}
}

func TestCalcAssociativityDiv(t *testing.T) {
	result, err := Calc("12 / 3 / 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 2 {
		t.Errorf("expected 2, got %f", result)
	}
}

func TestCalcAssociativityPower(t *testing.T) {
	result, err := Calc("2 ** 3 ** 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 512 {
		t.Errorf("expected 512, got %f", result)
	}
}

func TestCalcUnaryMinus(t *testing.T) {
	result, err := Calc("-5")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != -5 {
		t.Errorf("expected -5, got %f", result)
	}
}

func TestCalcDoubleUnaryMinus(t *testing.T) {
	result, err := Calc("--5")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 5 {
		t.Errorf("expected 5, got %f", result)
	}
}

func TestCalcUnaryMinusInParens(t *testing.T) {
	result, err := Calc("-(-5)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 5 {
		t.Errorf("expected 5, got %f", result)
	}
}

func TestCalcUnaryMinusInMul(t *testing.T) {
	result, err := Calc("2 * -3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != -6 {
		t.Errorf("expected -6, got %f", result)
	}
}

func TestCalcUnaryMinusBeforePower(t *testing.T) {
	result, err := Calc("-2 ** 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 4 {
		t.Errorf("expected 4, got %f", result)
	}
}

func TestCalcUnaryMinusAfterPower(t *testing.T) {
	result, err := Calc("-(2 ** 2)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != -4 {
		t.Errorf("expected -4, got %f", result)
	}
}

func TestCalcDecimal(t *testing.T) {
	result, err := Calc("3.14 * 2")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if math.Abs(result-6.28) > 0.0001 {
		t.Errorf("expected 6.28, got %f", result)
	}
}

func TestCalcLeadingDecimal(t *testing.T) {
	result, err := Calc(".5 + .5")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 1 {
		t.Errorf("expected 1, got %f", result)
	}
}

func TestCalcComplex(t *testing.T) {
	result, err := Calc("2 + 3 * 4 - 1")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 13 {
		t.Errorf("expected 13, got %f", result)
	}
}

func TestCalcComplex2(t *testing.T) {
	result, err := Calc("(2 + 3) * (4 - 1) / 5")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 3 {
		t.Errorf("expected 3, got %f", result)
	}
}

func TestCalcComplex3(t *testing.T) {
	result, err := Calc("10 % 3 + 2 ** 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 9 {
		t.Errorf("expected 9, got %f", result)
	}
}

func TestCalcComplex4(t *testing.T) {
	result, err := Calc("2 ** (1 + 2)")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 8 {
		t.Errorf("expected 8, got %f", result)
	}
}

func TestCalcComplex5(t *testing.T) {
	result, err := Calc("100 / 10 / 2 + 3")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if result != 8 {
		t.Errorf("expected 8, got %f", result)
	}
}

// Error cases
func TestCalcEmptyExpression(t *testing.T) {
	_, err := Calc("")
	if err == nil {
		t.Errorf("expected error for empty expression")
	}
}

func TestCalcWhitespaceOnly(t *testing.T) {
	_, err := Calc("   ")
	if err == nil {
		t.Errorf("expected error for whitespace-only expression")
	}
}

func TestCalcDivideByZero(t *testing.T) {
	_, err := Calc("1 / 0")
	if err == nil {
		t.Errorf("expected error for division by zero")
	}
}

func TestCalcModuloByZero(t *testing.T) {
	_, err := Calc("5 % 0")
	if err == nil {
		t.Errorf("expected error for modulo by zero")
	}
}

func TestCalcUnmatchedParen(t *testing.T) {
	_, err := Calc("(2 + 3")
	if err == nil {
		t.Errorf("expected error for unmatched paren")
	}
}

func TestCalcInvalidChar(t *testing.T) {
	_, err := Calc("2 @ 3")
	if err == nil {
		t.Errorf("expected error for invalid character")
	}
}

func TestCalcIncompleteExpression(t *testing.T) {
	_, err := Calc("2 +")
	if err == nil {
		t.Errorf("expected error for incomplete expression")
	}
}
