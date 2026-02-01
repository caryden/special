package mathexpr

import (
	"math"
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// Token types tests
// ---------------------------------------------------------------------------

func TestTokenCreation(t *testing.T) {
	t.Run("token creates a Token with kind and value", func(t *testing.T) {
		tok := NewToken("number", "42")
		if tok.Kind != "number" {
			t.Errorf("expected kind 'number', got %q", tok.Kind)
		}
		if tok.Value != "42" {
			t.Errorf("expected value '42', got %q", tok.Value)
		}
	})

	t.Run("token creates operator tokens", func(t *testing.T) {
		cases := []struct {
			kind  string
			value string
		}{
			{"plus", "+"},
			{"minus", "-"},
			{"star", "*"},
			{"slash", "/"},
			{"percent", "%"},
			{"power", "**"},
			{"lparen", "("},
			{"rparen", ")"},
		}
		for _, c := range cases {
			tok := NewToken(c.kind, c.value)
			if tok.Kind != c.kind || tok.Value != c.value {
				t.Errorf("NewToken(%q, %q) = {%q, %q}", c.kind, c.value, tok.Kind, tok.Value)
			}
		}
	})
}

// ---------------------------------------------------------------------------
// AST types tests
// ---------------------------------------------------------------------------

func TestAstTypes(t *testing.T) {
	t.Run("numberLiteral creates a number node", func(t *testing.T) {
		n := NewNumberLiteral(42)
		if n.Val != 42 {
			t.Errorf("expected 42, got %f", n.Val)
		}
		if n.nodeType() != "number" {
			t.Errorf("expected nodeType 'number', got %q", n.nodeType())
		}
	})

	t.Run("unaryExpr creates a unary node", func(t *testing.T) {
		operand := NewNumberLiteral(5)
		u := NewUnaryExpr("-", operand)
		if u.Op != "-" {
			t.Errorf("expected op '-', got %q", u.Op)
		}
		if u.nodeType() != "unary" {
			t.Errorf("expected nodeType 'unary', got %q", u.nodeType())
		}
		inner, ok := u.Operand.(NumberLiteral)
		if !ok || inner.Val != 5 {
			t.Errorf("expected operand NumberLiteral(5)")
		}
	})

	t.Run("binaryExpr creates a binary node", func(t *testing.T) {
		left := NewNumberLiteral(2)
		right := NewNumberLiteral(3)
		b := NewBinaryExpr("+", left, right)
		if b.Op != "+" {
			t.Errorf("expected op '+', got %q", b.Op)
		}
		if b.nodeType() != "binary" {
			t.Errorf("expected nodeType 'binary', got %q", b.nodeType())
		}
		l, ok := b.Left.(NumberLiteral)
		if !ok || l.Val != 2 {
			t.Errorf("expected left NumberLiteral(2)")
		}
		r, ok := b.Right.(NumberLiteral)
		if !ok || r.Val != 3 {
			t.Errorf("expected right NumberLiteral(3)")
		}
	})

	t.Run("nested expressions", func(t *testing.T) {
		inner := NewBinaryExpr("+", NewNumberLiteral(2), NewNumberLiteral(3))
		neg := NewUnaryExpr("-", NewNumberLiteral(4))
		expr := NewBinaryExpr("*", inner, neg)
		if expr.nodeType() != "binary" {
			t.Errorf("expected nodeType 'binary'")
		}
		if expr.Op != "*" {
			t.Errorf("expected op '*'")
		}
		leftBin, ok := expr.Left.(BinaryExpr)
		if !ok || leftBin.Op != "+" {
			t.Errorf("expected left to be BinaryExpr with op '+'")
		}
		rightUn, ok := expr.Right.(UnaryExpr)
		if !ok || rightUn.Op != "-" {
			t.Errorf("expected right to be UnaryExpr with op '-'")
		}
	})
}

// ---------------------------------------------------------------------------
// Tokenizer tests
// ---------------------------------------------------------------------------

func tokensEqual(a, b []Token) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].Kind != b[i].Kind || a[i].Value != b[i].Value {
			return false
		}
	}
	return true
}

func TestTokenizer(t *testing.T) {
	t.Run("empty string", func(t *testing.T) {
		tokens, err := Tokenize("")
		if err != nil {
			t.Fatal(err)
		}
		if len(tokens) != 0 {
			t.Errorf("expected empty, got %d tokens", len(tokens))
		}
	})

	t.Run("whitespace only", func(t *testing.T) {
		tokens, err := Tokenize("   \t\n\r  ")
		if err != nil {
			t.Fatal(err)
		}
		if len(tokens) != 0 {
			t.Errorf("expected empty, got %d tokens", len(tokens))
		}
	})

	t.Run("single integer", func(t *testing.T) {
		tokens, err := Tokenize("42")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{{Kind: "number", Value: "42"}}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("decimal number", func(t *testing.T) {
		tokens, err := Tokenize("3.14")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{{Kind: "number", Value: "3.14"}}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("number starting with dot", func(t *testing.T) {
		tokens, err := Tokenize(".5")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{{Kind: "number", Value: ".5"}}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("all operators", func(t *testing.T) {
		tokens, err := Tokenize("+ - * / % **")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{
			{Kind: "plus", Value: "+"},
			{Kind: "minus", Value: "-"},
			{Kind: "star", Value: "*"},
			{Kind: "slash", Value: "/"},
			{Kind: "percent", Value: "%"},
			{Kind: "power", Value: "**"},
		}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("parentheses", func(t *testing.T) {
		tokens, err := Tokenize("(1)")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{
			{Kind: "lparen", Value: "("},
			{Kind: "number", Value: "1"},
			{Kind: "rparen", Value: ")"},
		}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("complex expression", func(t *testing.T) {
		tokens, err := Tokenize("2 + 3 * (4 - 1)")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{
			{Kind: "number", Value: "2"},
			{Kind: "plus", Value: "+"},
			{Kind: "number", Value: "3"},
			{Kind: "star", Value: "*"},
			{Kind: "lparen", Value: "("},
			{Kind: "number", Value: "4"},
			{Kind: "minus", Value: "-"},
			{Kind: "number", Value: "1"},
			{Kind: "rparen", Value: ")"},
		}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("power operator distinguished from multiply", func(t *testing.T) {
		tokens, err := Tokenize("2**3*4")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{
			{Kind: "number", Value: "2"},
			{Kind: "power", Value: "**"},
			{Kind: "number", Value: "3"},
			{Kind: "star", Value: "*"},
			{Kind: "number", Value: "4"},
		}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("no whitespace", func(t *testing.T) {
		tokens, err := Tokenize("1+2")
		if err != nil {
			t.Fatal(err)
		}
		expected := []Token{
			{Kind: "number", Value: "1"},
			{Kind: "plus", Value: "+"},
			{Kind: "number", Value: "2"},
		}
		if !tokensEqual(tokens, expected) {
			t.Errorf("expected %v, got %v", expected, tokens)
		}
	})

	t.Run("multiple decimals in one number throws", func(t *testing.T) {
		_, err := Tokenize("1.2.3")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Unexpected character '.'") {
			t.Errorf("expected error about '.', got: %s", err.Error())
		}
	})

	t.Run("unrecognized character throws", func(t *testing.T) {
		_, err := Tokenize("2 @ 3")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Unexpected character '@'") {
			t.Errorf("expected error about '@', got: %s", err.Error())
		}
	})

	t.Run("unrecognized character reports position", func(t *testing.T) {
		_, err := Tokenize("2 @ 3")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "position 2") {
			t.Errorf("expected error with position 2, got: %s", err.Error())
		}
	})
}

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

// helper: tokenize then parse
func p(input string) (AstNode, error) {
	tokens, err := Tokenize(input)
	if err != nil {
		return nil, err
	}
	return Parse(tokens)
}

func assertNumberLiteral(t *testing.T, node AstNode, expected float64) {
	t.Helper()
	n, ok := node.(NumberLiteral)
	if !ok {
		t.Fatalf("expected NumberLiteral, got %T", node)
	}
	if n.Val != expected {
		t.Errorf("expected %f, got %f", expected, n.Val)
	}
}

func assertBinaryExpr(t *testing.T, node AstNode, op string) BinaryExpr {
	t.Helper()
	b, ok := node.(BinaryExpr)
	if !ok {
		t.Fatalf("expected BinaryExpr, got %T", node)
	}
	if b.Op != op {
		t.Errorf("expected op %q, got %q", op, b.Op)
	}
	return b
}

func assertUnaryExpr(t *testing.T, node AstNode, op string) UnaryExpr {
	t.Helper()
	u, ok := node.(UnaryExpr)
	if !ok {
		t.Fatalf("expected UnaryExpr, got %T", node)
	}
	if u.Op != op {
		t.Errorf("expected op %q, got %q", op, u.Op)
	}
	return u
}

func TestParserAtoms(t *testing.T) {
	t.Run("single number", func(t *testing.T) {
		ast, err := p("42")
		if err != nil {
			t.Fatal(err)
		}
		assertNumberLiteral(t, ast, 42)
	})

	t.Run("decimal number", func(t *testing.T) {
		ast, err := p("3.14")
		if err != nil {
			t.Fatal(err)
		}
		assertNumberLiteral(t, ast, 3.14)
	})

	t.Run("parenthesized number", func(t *testing.T) {
		ast, err := p("(42)")
		if err != nil {
			t.Fatal(err)
		}
		assertNumberLiteral(t, ast, 42)
	})

	t.Run("nested parentheses", func(t *testing.T) {
		ast, err := p("((7))")
		if err != nil {
			t.Fatal(err)
		}
		assertNumberLiteral(t, ast, 7)
	})
}

func TestParserBinaryOps(t *testing.T) {
	cases := []struct {
		name  string
		input string
		op    string
		left  float64
		right float64
	}{
		{"addition", "2 + 3", "+", 2, 3},
		{"subtraction", "5 - 1", "-", 5, 1},
		{"multiplication", "4 * 6", "*", 4, 6},
		{"division", "10 / 2", "/", 10, 2},
		{"modulo", "10 % 3", "%", 10, 3},
		{"power", "2 ** 3", "**", 2, 3},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			ast, err := p(c.input)
			if err != nil {
				t.Fatal(err)
			}
			b := assertBinaryExpr(t, ast, c.op)
			assertNumberLiteral(t, b.Left, c.left)
			assertNumberLiteral(t, b.Right, c.right)
		})
	}
}

func TestParserPrecedence(t *testing.T) {
	t.Run("multiply before add: 2 + 3 * 4", func(t *testing.T) {
		ast, err := p("2 + 3 * 4")
		if err != nil {
			t.Fatal(err)
		}
		b := assertBinaryExpr(t, ast, "+")
		assertNumberLiteral(t, b.Left, 2)
		inner := assertBinaryExpr(t, b.Right, "*")
		assertNumberLiteral(t, inner.Left, 3)
		assertNumberLiteral(t, inner.Right, 4)
	})

	t.Run("power before multiply: 2 * 3 ** 2", func(t *testing.T) {
		ast, err := p("2 * 3 ** 2")
		if err != nil {
			t.Fatal(err)
		}
		b := assertBinaryExpr(t, ast, "*")
		assertNumberLiteral(t, b.Left, 2)
		inner := assertBinaryExpr(t, b.Right, "**")
		assertNumberLiteral(t, inner.Left, 3)
		assertNumberLiteral(t, inner.Right, 2)
	})

	t.Run("parens override precedence: (2 + 3) * 4", func(t *testing.T) {
		ast, err := p("(2 + 3) * 4")
		if err != nil {
			t.Fatal(err)
		}
		b := assertBinaryExpr(t, ast, "*")
		inner := assertBinaryExpr(t, b.Left, "+")
		assertNumberLiteral(t, inner.Left, 2)
		assertNumberLiteral(t, inner.Right, 3)
		assertNumberLiteral(t, b.Right, 4)
	})
}

func TestParserAssociativity(t *testing.T) {
	t.Run("left-associative add: 1 - 2 - 3", func(t *testing.T) {
		ast, err := p("1 - 2 - 3")
		if err != nil {
			t.Fatal(err)
		}
		// (1 - 2) - 3
		outer := assertBinaryExpr(t, ast, "-")
		inner := assertBinaryExpr(t, outer.Left, "-")
		assertNumberLiteral(t, inner.Left, 1)
		assertNumberLiteral(t, inner.Right, 2)
		assertNumberLiteral(t, outer.Right, 3)
	})

	t.Run("left-associative multiply: 12 / 3 / 2", func(t *testing.T) {
		ast, err := p("12 / 3 / 2")
		if err != nil {
			t.Fatal(err)
		}
		// (12 / 3) / 2
		outer := assertBinaryExpr(t, ast, "/")
		inner := assertBinaryExpr(t, outer.Left, "/")
		assertNumberLiteral(t, inner.Left, 12)
		assertNumberLiteral(t, inner.Right, 3)
		assertNumberLiteral(t, outer.Right, 2)
	})

	t.Run("right-associative power: 2 ** 3 ** 2", func(t *testing.T) {
		ast, err := p("2 ** 3 ** 2")
		if err != nil {
			t.Fatal(err)
		}
		// 2 ** (3 ** 2)
		outer := assertBinaryExpr(t, ast, "**")
		assertNumberLiteral(t, outer.Left, 2)
		inner := assertBinaryExpr(t, outer.Right, "**")
		assertNumberLiteral(t, inner.Left, 3)
		assertNumberLiteral(t, inner.Right, 2)
	})
}

func TestParserUnary(t *testing.T) {
	t.Run("unary minus", func(t *testing.T) {
		ast, err := p("-5")
		if err != nil {
			t.Fatal(err)
		}
		u := assertUnaryExpr(t, ast, "-")
		assertNumberLiteral(t, u.Operand, 5)
	})

	t.Run("double unary minus", func(t *testing.T) {
		ast, err := p("--5")
		if err != nil {
			t.Fatal(err)
		}
		outer := assertUnaryExpr(t, ast, "-")
		inner := assertUnaryExpr(t, outer.Operand, "-")
		assertNumberLiteral(t, inner.Operand, 5)
	})

	t.Run("unary in expression: 2 * -3", func(t *testing.T) {
		ast, err := p("2 * -3")
		if err != nil {
			t.Fatal(err)
		}
		b := assertBinaryExpr(t, ast, "*")
		assertNumberLiteral(t, b.Left, 2)
		u := assertUnaryExpr(t, b.Right, "-")
		assertNumberLiteral(t, u.Operand, 3)
	})
}

func TestParserErrors(t *testing.T) {
	t.Run("empty token list", func(t *testing.T) {
		_, err := Parse([]Token{})
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Unexpected end of input") {
			t.Errorf("expected 'Unexpected end of input', got: %s", err.Error())
		}
	})

	t.Run("unmatched left paren", func(t *testing.T) {
		_, err := p("(2 + 3")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Expected rparen") {
			t.Errorf("expected 'Expected rparen', got: %s", err.Error())
		}
	})

	t.Run("unmatched right paren", func(t *testing.T) {
		_, err := p("2 + 3)")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Unexpected token after expression") {
			t.Errorf("expected 'Unexpected token after expression', got: %s", err.Error())
		}
	})

	t.Run("unexpected operator at start", func(t *testing.T) {
		_, err := p("* 5")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Unexpected token: star") {
			t.Errorf("expected 'Unexpected token: star', got: %s", err.Error())
		}
	})

	t.Run("trailing operator", func(t *testing.T) {
		_, err := p("2 +")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Unexpected end of input") {
			t.Errorf("expected 'Unexpected end of input', got: %s", err.Error())
		}
	})
}

// ---------------------------------------------------------------------------
// Evaluator tests
// ---------------------------------------------------------------------------

func TestEvaluator(t *testing.T) {
	t.Run("number literal", func(t *testing.T) {
		val, err := Evaluate(NewNumberLiteral(42))
		if err != nil {
			t.Fatal(err)
		}
		if val != 42 {
			t.Errorf("expected 42, got %f", val)
		}
	})

	t.Run("unary negation", func(t *testing.T) {
		val, err := Evaluate(NewUnaryExpr("-", NewNumberLiteral(5)))
		if err != nil {
			t.Fatal(err)
		}
		if val != -5 {
			t.Errorf("expected -5, got %f", val)
		}
	})

	t.Run("addition", func(t *testing.T) {
		val, err := Evaluate(NewBinaryExpr("+", NewNumberLiteral(2), NewNumberLiteral(3)))
		if err != nil {
			t.Fatal(err)
		}
		if val != 5 {
			t.Errorf("expected 5, got %f", val)
		}
	})

	t.Run("subtraction", func(t *testing.T) {
		val, err := Evaluate(NewBinaryExpr("-", NewNumberLiteral(10), NewNumberLiteral(4)))
		if err != nil {
			t.Fatal(err)
		}
		if val != 6 {
			t.Errorf("expected 6, got %f", val)
		}
	})

	t.Run("multiplication", func(t *testing.T) {
		val, err := Evaluate(NewBinaryExpr("*", NewNumberLiteral(3), NewNumberLiteral(7)))
		if err != nil {
			t.Fatal(err)
		}
		if val != 21 {
			t.Errorf("expected 21, got %f", val)
		}
	})

	t.Run("division", func(t *testing.T) {
		val, err := Evaluate(NewBinaryExpr("/", NewNumberLiteral(10), NewNumberLiteral(4)))
		if err != nil {
			t.Fatal(err)
		}
		if val != 2.5 {
			t.Errorf("expected 2.5, got %f", val)
		}
	})

	t.Run("modulo", func(t *testing.T) {
		val, err := Evaluate(NewBinaryExpr("%", NewNumberLiteral(10), NewNumberLiteral(3)))
		if err != nil {
			t.Fatal(err)
		}
		if val != 1 {
			t.Errorf("expected 1, got %f", val)
		}
	})

	t.Run("power", func(t *testing.T) {
		val, err := Evaluate(NewBinaryExpr("**", NewNumberLiteral(2), NewNumberLiteral(10)))
		if err != nil {
			t.Fatal(err)
		}
		if val != 1024 {
			t.Errorf("expected 1024, got %f", val)
		}
	})

	t.Run("division by zero throws", func(t *testing.T) {
		_, err := Evaluate(NewBinaryExpr("/", NewNumberLiteral(1), NewNumberLiteral(0)))
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Division by zero") {
			t.Errorf("expected 'Division by zero', got: %s", err.Error())
		}
	})

	t.Run("modulo by zero throws", func(t *testing.T) {
		_, err := Evaluate(NewBinaryExpr("%", NewNumberLiteral(1), NewNumberLiteral(0)))
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Modulo by zero") {
			t.Errorf("expected 'Modulo by zero', got: %s", err.Error())
		}
	})

	t.Run("nested expression: (2 + 3) * -4", func(t *testing.T) {
		expr := NewBinaryExpr(
			"*",
			NewBinaryExpr("+", NewNumberLiteral(2), NewNumberLiteral(3)),
			NewUnaryExpr("-", NewNumberLiteral(4)),
		)
		val, err := Evaluate(expr)
		if err != nil {
			t.Fatal(err)
		}
		if val != -20 {
			t.Errorf("expected -20, got %f", val)
		}
	})
}

// ---------------------------------------------------------------------------
// Calc (end-to-end) tests
// ---------------------------------------------------------------------------

func floatEquals(a, b float64) bool {
	if a == b {
		return true
	}
	return math.Abs(a-b) < 1e-12
}

func TestCalcBasicArithmetic(t *testing.T) {
	cases := []struct {
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
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %f, got %f", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcPrecedence(t *testing.T) {
	cases := []struct {
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
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %f, got %f", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcParentheses(t *testing.T) {
	cases := []struct {
		expr     string
		expected float64
	}{
		{"(2 + 3) * 4", 20},
		{"2 * (3 + 4)", 14},
		{"(2 + 3) * (4 + 5)", 45},
		{"((1 + 2) * (3 + 4))", 21},
		{"(10)", 10},
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %f, got %f", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcAssociativity(t *testing.T) {
	cases := []struct {
		expr     string
		expected float64
	}{
		{"1 - 2 - 3", -4},
		{"1 - 2 + 3", 2},
		{"12 / 3 / 2", 2},
		{"2 ** 3 ** 2", 512},
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %f, got %f", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcUnaryMinus(t *testing.T) {
	cases := []struct {
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
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %f, got %f", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcDecimals(t *testing.T) {
	cases := []struct {
		expr     string
		expected float64
	}{
		{"0.1 + 0.2", 0.1 + 0.2},
		{"3.14 * 2", 6.28},
		{".5 + .5", 1},
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %v, got %v", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcComplexExpressions(t *testing.T) {
	cases := []struct {
		expr     string
		expected float64
	}{
		{"2 + 3 * 4 - 1", 13},
		{"(2 + 3) * (4 - 1) / 5", 3},
		{"10 % 3 + 2 ** 3", 9},
		{"2 ** (1 + 2)", 8},
		{"100 / 10 / 2 + 3", 8},
	}
	for _, c := range cases {
		t.Run(c.expr, func(t *testing.T) {
			val, err := Calc(c.expr)
			if err != nil {
				t.Fatal(err)
			}
			if !floatEquals(val, c.expected) {
				t.Errorf("%s: expected %f, got %f", c.expr, c.expected, val)
			}
		})
	}
}

func TestCalcErrors(t *testing.T) {
	t.Run("empty expression", func(t *testing.T) {
		_, err := Calc("")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Empty expression") {
			t.Errorf("expected 'Empty expression', got: %s", err.Error())
		}
	})

	t.Run("whitespace only", func(t *testing.T) {
		_, err := Calc("   ")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Empty expression") {
			t.Errorf("expected 'Empty expression', got: %s", err.Error())
		}
	})

	t.Run("division by zero", func(t *testing.T) {
		_, err := Calc("1 / 0")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Division by zero") {
			t.Errorf("expected 'Division by zero', got: %s", err.Error())
		}
	})

	t.Run("modulo by zero", func(t *testing.T) {
		_, err := Calc("5 % 0")
		if err == nil {
			t.Fatal("expected error")
		}
		if !strings.Contains(err.Error(), "Modulo by zero") {
			t.Errorf("expected 'Modulo by zero', got: %s", err.Error())
		}
	})

	t.Run("unmatched paren", func(t *testing.T) {
		_, err := Calc("(2 + 3")
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("invalid character", func(t *testing.T) {
		_, err := Calc("2 @ 3")
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("trailing operator", func(t *testing.T) {
		_, err := Calc("2 +")
		if err == nil {
			t.Fatal("expected error")
		}
	})
}
