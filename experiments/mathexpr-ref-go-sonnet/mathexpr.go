package mathexpr

import (
	"fmt"
	"math"
	"strconv"
)

// TokenKind represents the type of a token
type TokenKind string

const (
	TokenNumber  TokenKind = "number"
	TokenPlus    TokenKind = "plus"
	TokenMinus   TokenKind = "minus"
	TokenStar    TokenKind = "star"
	TokenSlash   TokenKind = "slash"
	TokenPercent TokenKind = "percent"
	TokenPower   TokenKind = "power"
	TokenLParen  TokenKind = "lparen"
	TokenRParen  TokenKind = "rparen"
)

// Token represents a lexical token
type Token struct {
	Kind  TokenKind
	Value string
}

// NewToken creates a new token
func NewToken(kind TokenKind, value string) Token {
	return Token{Kind: kind, Value: value}
}

// AstNode is the interface for all AST node types
type AstNode interface {
	astNode()
}

// NumberLiteral represents a numeric literal
type NumberLiteral struct {
	Value float64
}

func (NumberLiteral) astNode() {}

// UnaryExpr represents a unary expression
type UnaryExpr struct {
	Op      string
	Operand AstNode
}

func (UnaryExpr) astNode() {}

// BinaryExpr represents a binary expression
type BinaryExpr struct {
	Op    string
	Left  AstNode
	Right AstNode
}

func (BinaryExpr) astNode() {}

// NewNumberLiteral creates a number literal node
func NewNumberLiteral(value float64) NumberLiteral {
	return NumberLiteral{Value: value}
}

// NewUnaryExpr creates a unary expression node
func NewUnaryExpr(op string, operand AstNode) UnaryExpr {
	return UnaryExpr{Op: op, Operand: operand}
}

// NewBinaryExpr creates a binary expression node
func NewBinaryExpr(op string, left, right AstNode) BinaryExpr {
	return BinaryExpr{Op: op, Left: left, Right: right}
}

// Tokenize converts a math expression string into a sequence of tokens
func Tokenize(input string) ([]Token, error) {
	tokens := []Token{}
	i := 0

	for i < len(input) {
		ch := input[i]

		// Skip whitespace
		if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
			i++
			continue
		}

		// Left paren
		if ch == '(' {
			tokens = append(tokens, NewToken(TokenLParen, "("))
			i++
			continue
		}

		// Right paren
		if ch == ')' {
			tokens = append(tokens, NewToken(TokenRParen, ")"))
			i++
			continue
		}

		// Plus
		if ch == '+' {
			tokens = append(tokens, NewToken(TokenPlus, "+"))
			i++
			continue
		}

		// Minus
		if ch == '-' {
			tokens = append(tokens, NewToken(TokenMinus, "-"))
			i++
			continue
		}

		// Star or Power
		if ch == '*' {
			if i+1 < len(input) && input[i+1] == '*' {
				tokens = append(tokens, NewToken(TokenPower, "**"))
				i += 2
			} else {
				tokens = append(tokens, NewToken(TokenStar, "*"))
				i++
			}
			continue
		}

		// Slash
		if ch == '/' {
			tokens = append(tokens, NewToken(TokenSlash, "/"))
			i++
			continue
		}

		// Percent
		if ch == '%' {
			tokens = append(tokens, NewToken(TokenPercent, "%"))
			i++
			continue
		}

		// Number
		if isDigit(ch) || ch == '.' {
			num := ""
			hasDot := false
			for i < len(input) && (isDigit(input[i]) || input[i] == '.') {
				if input[i] == '.' {
					if hasDot {
						return nil, fmt.Errorf("Unexpected character '.' at position %d", i)
					}
					hasDot = true
				}
				num += string(input[i])
				i++
			}
			tokens = append(tokens, NewToken(TokenNumber, num))
			continue
		}

		return nil, fmt.Errorf("Unexpected character '%c' at position %d", ch, i)
	}

	return tokens, nil
}

func isDigit(ch byte) bool {
	return ch >= '0' && ch <= '9'
}

// Parse parses a sequence of tokens into an AST
func Parse(tokens []Token) (AstNode, error) {
	pos := 0

	var peek func() *Token
	var advance func() Token
	var expect func(TokenKind) (Token, error)
	var parseAddSub func() (AstNode, error)
	var parseMulDiv func() (AstNode, error)
	var parsePower func() (AstNode, error)
	var parseUnary func() (AstNode, error)
	var parseAtom func() (AstNode, error)

	peek = func() *Token {
		if pos < len(tokens) {
			return &tokens[pos]
		}
		return nil
	}

	advance = func() Token {
		t := tokens[pos]
		pos++
		return t
	}

	expect = func(kind TokenKind) (Token, error) {
		t := peek()
		if t == nil {
			return Token{}, fmt.Errorf("Expected %s but got end of input", kind)
		}
		if t.Kind != kind {
			return Token{}, fmt.Errorf("Expected %s but got %s", kind, t.Kind)
		}
		return advance(), nil
	}

	// Level 1: addition and subtraction (lowest precedence)
	parseAddSub = func() (AstNode, error) {
		left, err := parseMulDiv()
		if err != nil {
			return nil, err
		}
		for {
			t := peek()
			if t == nil || (t.Kind != TokenPlus && t.Kind != TokenMinus) {
				break
			}
			opToken := advance()
			op := "+"
			if opToken.Kind == TokenMinus {
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
			if t == nil || (t.Kind != TokenStar && t.Kind != TokenSlash && t.Kind != TokenPercent) {
				break
			}
			opToken := advance()
			op := "*"
			if opToken.Kind == TokenSlash {
				op = "/"
			} else if opToken.Kind == TokenPercent {
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
		if t != nil && t.Kind == TokenPower {
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
		if t != nil && t.Kind == TokenMinus {
			advance()
			operand, err := parseUnary() // allow chained unary: --x
			if err != nil {
				return nil, err
			}
			return NewUnaryExpr("-", operand), nil
		}
		return parseAtom()
	}

	// Level 5: atoms — numbers and parenthesized expressions
	parseAtom = func() (AstNode, error) {
		t := peek()
		if t == nil {
			return nil, fmt.Errorf("Unexpected end of input")
		}

		if t.Kind == TokenNumber {
			advance()
			value, err := strconv.ParseFloat(t.Value, 64)
			if err != nil {
				return nil, err
			}
			return NewNumberLiteral(value), nil
		}

		if t.Kind == TokenLParen {
			advance()
			expr, err := parseAddSub()
			if err != nil {
				return nil, err
			}
			_, err = expect(TokenRParen)
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

// Evaluate evaluates an AST node to produce a numeric result
func Evaluate(node AstNode) (float64, error) {
	switch n := node.(type) {
	case NumberLiteral:
		return n.Value, nil

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
		default:
			return 0, fmt.Errorf("Unknown operator: %s", n.Op)
		}

	default:
		return 0, fmt.Errorf("Unknown node type")
	}
}

// Calc is the public API function that evaluates a math expression string
func Calc(expression string) (float64, error) {
	if len(expression) == 0 || len(expression) == len(trimSpace(expression)) && trimSpace(expression) == "" {
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

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}
