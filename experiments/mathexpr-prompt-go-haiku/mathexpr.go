package mathexpr

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
)

// Token types
const (
	TokenNumber = iota
	TokenPlus
	TokenMinus
	TokenStar
	TokenSlash
	TokenPercent
	TokenPower
	TokenLParen
	TokenRParen
	TokenEOF
)

// Token represents a single lexical token
type Token struct {
	Type  int
	Value string
}

// Tokenizer converts a string into a sequence of tokens
type Tokenizer struct {
	input string
	pos   int
}

// NewTokenizer creates a new tokenizer for the given input
func NewTokenizer(input string) *Tokenizer {
	return &Tokenizer{input: input, pos: 0}
}

// Next returns the next token
func (t *Tokenizer) Next() (Token, error) {
	// Skip whitespace
	for t.pos < len(t.input) && unicode.IsSpace(rune(t.input[t.pos])) {
		t.pos++
	}

	if t.pos >= len(t.input) {
		return Token{Type: TokenEOF}, nil
	}

	ch := t.input[t.pos]

	// Check for number (including decimals and .5 format)
	if unicode.IsDigit(rune(ch)) || ch == '.' {
		return t.readNumber()
	}

	// Single character tokens
	switch ch {
	case '+':
		t.pos++
		return Token{Type: TokenPlus, Value: "+"}, nil
	case '-':
		t.pos++
		return Token{Type: TokenMinus, Value: "-"}, nil
	case '*':
		t.pos++
		if t.pos < len(t.input) && t.input[t.pos] == '*' {
			t.pos++
			return Token{Type: TokenPower, Value: "**"}, nil
		}
		return Token{Type: TokenStar, Value: "*"}, nil
	case '/':
		t.pos++
		return Token{Type: TokenSlash, Value: "/"}, nil
	case '%':
		t.pos++
		return Token{Type: TokenPercent, Value: "%"}, nil
	case '(':
		t.pos++
		return Token{Type: TokenLParen, Value: "("}, nil
	case ')':
		t.pos++
		return Token{Type: TokenRParen, Value: ")"}, nil
	default:
		return Token{}, fmt.Errorf("invalid character: %c", ch)
	}
}

// readNumber reads a number token (handles integers and decimals)
func (t *Tokenizer) readNumber() (Token, error) {
	start := t.pos
	hasDot := false

	// Handle .5 format (leading decimal point)
	if t.input[t.pos] == '.' {
		hasDot = true
		t.pos++
		if t.pos >= len(t.input) || !unicode.IsDigit(rune(t.input[t.pos])) {
			return Token{}, fmt.Errorf("invalid number: missing digits after decimal point")
		}
	}

	// Read digits
	for t.pos < len(t.input) {
		ch := t.input[t.pos]
		if unicode.IsDigit(rune(ch)) {
			t.pos++
		} else if ch == '.' && !hasDot {
			hasDot = true
			t.pos++
		} else {
			break
		}
	}

	value := t.input[start:t.pos]
	if value == "." {
		return Token{}, fmt.Errorf("invalid number: empty")
	}

	return Token{Type: TokenNumber, Value: value}, nil
}

// AST Node types
type Node interface {
	Evaluate() (float64, error)
}

// NumberNode represents a numeric literal
type NumberNode struct {
	Value float64
}

func (n *NumberNode) Evaluate() (float64, error) {
	return n.Value, nil
}

// BinaryOpNode represents a binary operation
type BinaryOpNode struct {
	Left  Node
	Op    string
	Right Node
}

func (n *BinaryOpNode) Evaluate() (float64, error) {
	left, err := n.Left.Evaluate()
	if err != nil {
		return 0, err
	}

	right, err := n.Right.Evaluate()
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
	case "/":
		if right == 0 {
			return 0, fmt.Errorf("division by zero")
		}
		return left / right, nil
	case "%":
		if right == 0 {
			return 0, fmt.Errorf("modulo by zero")
		}
		return math.Mod(left, right), nil
	case "**":
		return math.Pow(left, right), nil
	default:
		return 0, fmt.Errorf("unknown operator: %s", n.Op)
	}
}

// UnaryOpNode represents a unary operation
type UnaryOpNode struct {
	Op   string
	Node Node
}

func (n *UnaryOpNode) Evaluate() (float64, error) {
	val, err := n.Node.Evaluate()
	if err != nil {
		return 0, err
	}

	switch n.Op {
	case "-":
		return -val, nil
	default:
		return 0, fmt.Errorf("unknown unary operator: %s", n.Op)
	}
}

// Parser converts tokens into an AST
type Parser struct {
	tokens []*Token
	pos    int
}

// NewParser creates a new parser from a tokenizer
func NewParser(tokenizer *Tokenizer) (*Parser, error) {
	var tokens []*Token

	for {
		token, err := tokenizer.Next()
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, &token)
		if token.Type == TokenEOF {
			break
		}
	}

	if len(tokens) == 0 {
		return nil, fmt.Errorf("empty input")
	}

	return &Parser{tokens: tokens, pos: 0}, nil
}

// currentToken returns the current token without advancing
func (p *Parser) currentToken() *Token {
	if p.pos < len(p.tokens) {
		return p.tokens[p.pos]
	}
	return nil
}

// advanceToken advances to the next token
func (p *Parser) advanceToken() {
	p.pos++
}

// Parse parses the tokens into an AST
func (p *Parser) Parse() (Node, error) {
	node, err := p.parseAddition()
	if err != nil {
		return nil, err
	}

	// Ensure we've consumed all tokens
	if p.currentToken().Type != TokenEOF {
		return nil, fmt.Errorf("unexpected token: %s", p.currentToken().Value)
	}

	return node, nil
}

// parseAddition parses addition and subtraction (lowest precedence)
func (p *Parser) parseAddition() (Node, error) {
	left, err := p.parseMultiplication()
	if err != nil {
		return nil, err
	}

	for p.currentToken().Type == TokenPlus || p.currentToken().Type == TokenMinus {
		op := p.currentToken().Value
		p.advanceToken()

		right, err := p.parseMultiplication()
		if err != nil {
			return nil, err
		}

		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}

	return left, nil
}

// parseMultiplication parses multiplication, division, and modulo
func (p *Parser) parseMultiplication() (Node, error) {
	left, err := p.parseExponentiation()
	if err != nil {
		return nil, err
	}

	for p.currentToken().Type == TokenStar || p.currentToken().Type == TokenSlash || p.currentToken().Type == TokenPercent {
		op := p.currentToken().Value
		p.advanceToken()

		right, err := p.parseExponentiation()
		if err != nil {
			return nil, err
		}

		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}

	return left, nil
}

// parseExponentiation parses exponentiation (right-associative)
func (p *Parser) parseExponentiation() (Node, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}

	// Right-associative: parse recursively
	if p.currentToken().Type == TokenPower {
		op := p.currentToken().Value
		p.advanceToken()

		right, err := p.parseExponentiation() // Recursive for right-associativity
		if err != nil {
			return nil, err
		}

		return &BinaryOpNode{Left: left, Op: op, Right: right}, nil
	}

	return left, nil
}

// parseUnary parses unary operations (only unary minus, not unary plus)
func (p *Parser) parseUnary() (Node, error) {
	// Handle unary minus only
	if p.currentToken().Type == TokenMinus {
		p.advanceToken()
		node, err := p.parseUnary() // Recursive to handle --5, ---5, etc.
		if err != nil {
			return nil, err
		}
		return &UnaryOpNode{Op: "-", Node: node}, nil
	}

	return p.parsePrimary()
}

// parsePrimary parses primary expressions (numbers and parenthesized expressions)
func (p *Parser) parsePrimary() (Node, error) {
	token := p.currentToken()

	if token == nil {
		return nil, fmt.Errorf("unexpected end of input")
	}

	switch token.Type {
	case TokenNumber:
		value, err := strconv.ParseFloat(token.Value, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number: %s", token.Value)
		}
		p.advanceToken()
		return &NumberNode{Value: value}, nil

	case TokenLParen:
		p.advanceToken()
		node, err := p.parseAddition()
		if err != nil {
			return nil, err
		}

		if p.currentToken().Type != TokenRParen {
			return nil, fmt.Errorf("unmatched parentheses: missing )")
		}
		p.advanceToken()
		return node, nil

	case TokenRParen:
		return nil, fmt.Errorf("unmatched parentheses: unexpected )")

	case TokenEOF:
		return nil, fmt.Errorf("unexpected end of input")

	default:
		return nil, fmt.Errorf("unexpected token: %s", token.Value)
	}
}

// Calc evaluates a mathematical expression string
func Calc(expression string) (float64, error) {
	// Trim whitespace
	expression = strings.TrimSpace(expression)

	if expression == "" {
		return 0, fmt.Errorf("empty input")
	}

	// Tokenize
	tokenizer := NewTokenizer(expression)

	// Parse
	parser, err := NewParser(tokenizer)
	if err != nil {
		return 0, err
	}

	ast, err := parser.Parse()
	if err != nil {
		return 0, err
	}

	// Evaluate
	result, err := ast.Evaluate()
	if err != nil {
		return 0, err
	}

	return result, nil
}
