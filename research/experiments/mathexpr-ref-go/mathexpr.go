// Package mathexpr provides a math expression parser and evaluator.
//
// It implements a pipeline: Tokenize -> Parse -> Evaluate, composed
// into a single Calc() function as the public API.
package mathexpr

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

// Token represents a lexical token with a Kind and a Value.
type Token struct {
	Kind  string
	Value string
}

// NewToken creates a Token with the given kind and value.
func NewToken(kind, value string) Token {
	return Token{Kind: kind, Value: value}
}

// ---------------------------------------------------------------------------
// AST types
// ---------------------------------------------------------------------------

// AstNode is the interface implemented by all AST node types.
type AstNode interface {
	nodeType() string
}

// NumberLiteral represents a numeric value (leaf node).
type NumberLiteral struct {
	Val float64
}

func (n NumberLiteral) nodeType() string { return "number" }

// UnaryExpr represents a unary operator applied to an operand.
type UnaryExpr struct {
	Op      string
	Operand AstNode
}

func (u UnaryExpr) nodeType() string { return "unary" }

// BinaryExpr represents a binary operator applied to left and right operands.
type BinaryExpr struct {
	Op    string
	Left  AstNode
	Right AstNode
}

func (b BinaryExpr) nodeType() string { return "binary" }

// NewNumberLiteral creates a NumberLiteral node.
func NewNumberLiteral(value float64) NumberLiteral {
	return NumberLiteral{Val: value}
}

// NewUnaryExpr creates a UnaryExpr node.
func NewUnaryExpr(op string, operand AstNode) UnaryExpr {
	return UnaryExpr{Op: op, Operand: operand}
}

// NewBinaryExpr creates a BinaryExpr node.
func NewBinaryExpr(op string, left, right AstNode) BinaryExpr {
	return BinaryExpr{Op: op, Left: left, Right: right}
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

// Tokenize converts a math expression string into a sequence of tokens.
func Tokenize(input string) ([]Token, error) {
	tokens := []Token{}
	i := 0
	runes := []rune(input)

	for i < len(runes) {
		ch := runes[i]

		if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
			i++
			continue
		}

		if ch == '(' {
			tokens = append(tokens, NewToken("lparen", "("))
			i++
			continue
		}

		if ch == ')' {
			tokens = append(tokens, NewToken("rparen", ")"))
			i++
			continue
		}

		if ch == '+' {
			tokens = append(tokens, NewToken("plus", "+"))
			i++
			continue
		}

		if ch == '-' {
			tokens = append(tokens, NewToken("minus", "-"))
			i++
			continue
		}

		if ch == '*' {
			if i+1 < len(runes) && runes[i+1] == '*' {
				tokens = append(tokens, NewToken("power", "**"))
				i += 2
			} else {
				tokens = append(tokens, NewToken("star", "*"))
				i++
			}
			continue
		}

		if ch == '/' {
			tokens = append(tokens, NewToken("slash", "/"))
			i++
			continue
		}

		if ch == '%' {
			tokens = append(tokens, NewToken("percent", "%"))
			i++
			continue
		}

		if isDigit(ch) || ch == '.' {
			num := ""
			hasDot := false
			for i < len(runes) && (isDigit(runes[i]) || runes[i] == '.') {
				if runes[i] == '.' {
					if hasDot {
						return nil, fmt.Errorf("Unexpected character '.' at position %d", i)
					}
					hasDot = true
				}
				num += string(runes[i])
				i++
			}
			tokens = append(tokens, NewToken("number", num))
			continue
		}

		return nil, fmt.Errorf("Unexpected character '%c' at position %d", ch, i)
	}

	return tokens, nil
}

func isDigit(ch rune) bool {
	return ch >= '0' && ch <= '9'
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

// Parse converts a sequence of tokens into an AST using recursive descent.
func Parse(tokens []Token) (AstNode, error) {
	pos := 0

	peek := func() *Token {
		if pos < len(tokens) {
			t := tokens[pos]
			return &t
		}
		return nil
	}

	advance := func() Token {
		t := tokens[pos]
		pos++
		return t
	}

	expect := func(kind string) (Token, error) {
		t := peek()
		if t == nil || t.Kind != kind {
			got := "end of input"
			if t != nil {
				got = t.Kind
			}
			return Token{}, fmt.Errorf("Expected %s but got %s", kind, got)
		}
		return advance(), nil
	}

	// Forward declarations for mutual recursion
	var parseAddSub func() (AstNode, error)
	var parseMulDiv func() (AstNode, error)
	var parsePower func() (AstNode, error)
	var parseUnary func() (AstNode, error)
	var parseAtom func() (AstNode, error)

	// Level 1: addition and subtraction (lowest precedence)
	parseAddSub = func() (AstNode, error) {
		left, err := parseMulDiv()
		if err != nil {
			return nil, err
		}
		for {
			t := peek()
			if t == nil || (t.Kind != "plus" && t.Kind != "minus") {
				break
			}
			opToken := advance()
			op := "+"
			if opToken.Kind == "minus" {
				op = "-"
			}
			right, err := parseMulDiv()
			if err != nil {
				return nil, err
			}
			left = NewBinaryExpr(op, left, right)
		}
		return left, nil
	}

	// Level 2: multiplication, division, modulo
	parseMulDiv = func() (AstNode, error) {
		left, err := parsePower()
		if err != nil {
			return nil, err
		}
		for {
			t := peek()
			if t == nil || (t.Kind != "star" && t.Kind != "slash" && t.Kind != "percent") {
				break
			}
			opToken := advance()
			var op string
			switch opToken.Kind {
			case "star":
				op = "*"
			case "slash":
				op = "/"
			default:
				op = "%"
			}
			right, err := parsePower()
			if err != nil {
				return nil, err
			}
			left = NewBinaryExpr(op, left, right)
		}
		return left, nil
	}

	// Level 3: exponentiation (right-associative)
	parsePower = func() (AstNode, error) {
		base, err := parseUnary()
		if err != nil {
			return nil, err
		}
		t := peek()
		if t != nil && t.Kind == "power" {
			advance()
			exponent, err := parsePower() // right-recursive for right-associativity
			if err != nil {
				return nil, err
			}
			return NewBinaryExpr("**", base, exponent), nil
		}
		return base, nil
	}

	// Level 4: unary minus
	parseUnary = func() (AstNode, error) {
		t := peek()
		if t != nil && t.Kind == "minus" {
			advance()
			operand, err := parseUnary() // allow chained unary: --x
			if err != nil {
				return nil, err
			}
			return NewUnaryExpr("-", operand), nil
		}
		return parseAtom()
	}

	// Level 5: atoms -- numbers and parenthesized expressions
	parseAtom = func() (AstNode, error) {
		t := peek()

		if t == nil {
			return nil, fmt.Errorf("Unexpected end of input")
		}

		if t.Kind == "number" {
			advance()
			val, err := strconv.ParseFloat(t.Value, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid number: %s", t.Value)
			}
			return NewNumberLiteral(val), nil
		}

		if t.Kind == "lparen" {
			advance()
			expr, err := parseAddSub()
			if err != nil {
				return nil, err
			}
			_, err = expect("rparen")
			if err != nil {
				return nil, err
			}
			return expr, nil
		}

		return nil, fmt.Errorf("Unexpected token: %s '%s'", t.Kind, t.Value)
	}

	ast, err := parseAddSub()
	if err != nil {
		return nil, err
	}

	if pos < len(tokens) {
		remaining := tokens[pos]
		return nil, fmt.Errorf("Unexpected token after expression: %s '%s'", remaining.Kind, remaining.Value)
	}

	return ast, nil
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

// Evaluate evaluates an AST node to produce a numeric result.
func Evaluate(node AstNode) (float64, error) {
	switch n := node.(type) {
	case NumberLiteral:
		return n.Val, nil
	case UnaryExpr:
		operand, err := Evaluate(n.Operand)
		if err != nil {
			return 0, err
		}
		return -operand, nil
	case BinaryExpr:
		left, err := Evaluate(n.Left)
		if err != nil {
			return 0, err
		}
		right, err := Evaluate(n.Right)
		if err != nil {
			return 0, err
		}
		switch n.Op {
		case "+":
			return left + right, nil
		case "-":
			return left - right, nil
		case "*":
			return left * right, nil
		case "**":
			return math.Pow(left, right), nil
		case "/":
			if right == 0 {
				return 0, fmt.Errorf("Division by zero")
			}
			return left / right, nil
		case "%":
			if right == 0 {
				return 0, fmt.Errorf("Modulo by zero")
			}
			return math.Mod(left, right), nil
		}
	}
	return 0, fmt.Errorf("unknown node type")
}

// ---------------------------------------------------------------------------
// Calc -- public API
// ---------------------------------------------------------------------------

// Calc evaluates a math expression string and returns the result.
// It composes Tokenize -> Parse -> Evaluate.
func Calc(expression string) (float64, error) {
	if strings.TrimSpace(expression) == "" {
		return 0, fmt.Errorf("Empty expression")
	}
	tokens, err := Tokenize(expression)
	if err != nil {
		return 0, err
	}
	ast, err := Parse(tokens)
	if err != nil {
		return 0, err
	}
	return Evaluate(ast)
}
