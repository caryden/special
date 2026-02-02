package mathexpr

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
)

// TokenType represents the type of a token
type TokenType int

const (
	TokenNumber TokenType = iota
	TokenPlus
	TokenMinus
	TokenStar
	TokenSlash
	TokenPercent
	TokenPower
	TokenLeftParen
	TokenRightParen
	TokenEOF
)

// Token represents a lexical token
type Token struct {
	Type  TokenType
	Value string
}

// Tokenizer converts a string into a sequence of tokens
type Tokenizer struct {
	input string
	pos   int
}

// NewTokenizer creates a new tokenizer
func NewTokenizer(input string) *Tokenizer {
	return &Tokenizer{input: input, pos: 0}
}

// peek returns the current character without consuming it
func (t *Tokenizer) peek() rune {
	if t.pos >= len(t.input) {
		return 0
	}
	return rune(t.input[t.pos])
}

// advance moves to the next character
func (t *Tokenizer) advance() rune {
	if t.pos >= len(t.input) {
		return 0
	}
	ch := rune(t.input[t.pos])
	t.pos++
	return ch
}

// skipWhitespace skips whitespace characters
func (t *Tokenizer) skipWhitespace() {
	for t.peek() != 0 && unicode.IsSpace(t.peek()) {
		t.advance()
	}
}

// readNumber reads a number token
func (t *Tokenizer) readNumber() string {
	start := t.pos
	for t.peek() != 0 && (unicode.IsDigit(t.peek()) || t.peek() == '.') {
		t.advance()
	}
	return t.input[start:t.pos]
}

// NextToken returns the next token
func (t *Tokenizer) NextToken() (Token, error) {
	t.skipWhitespace()

	ch := t.peek()
	if ch == 0 {
		return Token{Type: TokenEOF}, nil
	}

	// Numbers (including decimals starting with .)
	if unicode.IsDigit(ch) || ch == '.' {
		num := t.readNumber()
		return Token{Type: TokenNumber, Value: num}, nil
	}

	// Operators
	switch ch {
	case '+':
		t.advance()
		return Token{Type: TokenPlus}, nil
	case '-':
		t.advance()
		return Token{Type: TokenMinus}, nil
	case '*':
		t.advance()
		// Check for **
		if t.peek() == '*' {
			t.advance()
			return Token{Type: TokenPower}, nil
		}
		return Token{Type: TokenStar}, nil
	case '/':
		t.advance()
		return Token{Type: TokenSlash}, nil
	case '%':
		t.advance()
		return Token{Type: TokenPercent}, nil
	case '(':
		t.advance()
		return Token{Type: TokenLeftParen}, nil
	case ')':
		t.advance()
		return Token{Type: TokenRightParen}, nil
	default:
		return Token{}, fmt.Errorf("invalid character: %c", ch)
	}
}

// Tokenize converts the entire input into a list of tokens
func Tokenize(input string) ([]Token, error) {
	tokenizer := NewTokenizer(input)
	var tokens []Token

	for {
		token, err := tokenizer.NextToken()
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
		if token.Type == TokenEOF {
			break
		}
	}

	return tokens, nil
}

// Node represents an AST node
type Node interface {
	Evaluate() (float64, error)
}

// NumberNode represents a number literal
type NumberNode struct {
	Value float64
}

func (n *NumberNode) Evaluate() (float64, error) {
	return n.Value, nil
}

// UnaryNode represents a unary operation
type UnaryNode struct {
	Operator TokenType
	Operand  Node
}

func (n *UnaryNode) Evaluate() (float64, error) {
	val, err := n.Operand.Evaluate()
	if err != nil {
		return 0, err
	}

	switch n.Operator {
	case TokenMinus:
		return -val, nil
	default:
		return 0, fmt.Errorf("unknown unary operator")
	}
}

// BinaryNode represents a binary operation
type BinaryNode struct {
	Operator TokenType
	Left     Node
	Right    Node
}

func (n *BinaryNode) Evaluate() (float64, error) {
	left, err := n.Left.Evaluate()
	if err != nil {
		return 0, err
	}

	right, err := n.Right.Evaluate()
	if err != nil {
		return 0, err
	}

	switch n.Operator {
	case TokenPlus:
		return left + right, nil
	case TokenMinus:
		return left - right, nil
	case TokenStar:
		return left * right, nil
	case TokenSlash:
		if right == 0 {
			return 0, fmt.Errorf("division by zero")
		}
		return left / right, nil
	case TokenPercent:
		if right == 0 {
			return 0, fmt.Errorf("modulo by zero")
		}
		return math.Mod(left, right), nil
	case TokenPower:
		return math.Pow(left, right), nil
	default:
		return 0, fmt.Errorf("unknown binary operator")
	}
}

// Parser converts tokens into an AST
type Parser struct {
	tokens []Token
	pos    int
}

// NewParser creates a new parser
func NewParser(tokens []Token) *Parser {
	return &Parser{tokens: tokens, pos: 0}
}

// peek returns the current token without consuming it
func (p *Parser) peek() Token {
	if p.pos >= len(p.tokens) {
		return Token{Type: TokenEOF}
	}
	return p.tokens[p.pos]
}

// advance moves to the next token
func (p *Parser) advance() Token {
	if p.pos >= len(p.tokens) {
		return Token{Type: TokenEOF}
	}
	token := p.tokens[p.pos]
	p.pos++
	return token
}

// expect consumes a token of the given type
func (p *Parser) expect(tokenType TokenType) error {
	token := p.peek()
	if token.Type != tokenType {
		return fmt.Errorf("expected token type %d, got %d", tokenType, token.Type)
	}
	p.advance()
	return nil
}

// Parse parses the tokens into an AST
func (p *Parser) Parse() (Node, error) {
	if p.peek().Type == TokenEOF {
		return nil, fmt.Errorf("empty input")
	}

	node, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	if p.peek().Type != TokenEOF {
		return nil, fmt.Errorf("unexpected token after expression")
	}

	return node, nil
}

// parseExpression parses an expression (lowest precedence: addition/subtraction)
func (p *Parser) parseExpression() (Node, error) {
	return p.parseBinaryOp(p.parseTerm, TokenPlus, TokenMinus)
}

// parseTerm parses a term (multiplication/division/modulo)
func (p *Parser) parseTerm() (Node, error) {
	return p.parseBinaryOp(p.parseExponentiation, TokenStar, TokenSlash, TokenPercent)
}

// parseExponentiation parses exponentiation (right-associative)
func (p *Parser) parseExponentiation() (Node, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}

	// Right-associative: 2 ** 3 ** 2 = 2 ** (3 ** 2)
	if p.peek().Type == TokenPower {
		op := p.advance()
		right, err := p.parseExponentiation() // Recursive call for right associativity
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Operator: op.Type, Left: left, Right: right}, nil
	}

	return left, nil
}

// parseUnary parses a unary expression
func (p *Parser) parseUnary() (Node, error) {
	token := p.peek()

	if token.Type == TokenMinus {
		p.advance()
		operand, err := p.parseUnary() // Allow chaining of unary operators
		if err != nil {
			return nil, err
		}
		return &UnaryNode{Operator: TokenMinus, Operand: operand}, nil
	}

	return p.parsePrimary()
}

// parsePrimary parses a primary expression (number or parenthesized expression)
func (p *Parser) parsePrimary() (Node, error) {
	token := p.peek()

	switch token.Type {
	case TokenNumber:
		p.advance()
		value, err := strconv.ParseFloat(token.Value, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number: %s", token.Value)
		}
		return &NumberNode{Value: value}, nil

	case TokenLeftParen:
		p.advance()
		node, err := p.parseExpression()
		if err != nil {
			return nil, err
		}
		if err := p.expect(TokenRightParen); err != nil {
			return nil, fmt.Errorf("unmatched parentheses")
		}
		return node, nil

	default:
		return nil, fmt.Errorf("malformed expression")
	}
}

// parseBinaryOp is a helper for parsing left-associative binary operators
func (p *Parser) parseBinaryOp(parseNext func() (Node, error), operators ...TokenType) (Node, error) {
	left, err := parseNext()
	if err != nil {
		return nil, err
	}

	for {
		token := p.peek()
		matched := false
		for _, op := range operators {
			if token.Type == op {
				matched = true
				break
			}
		}

		if !matched {
			break
		}

		p.advance()
		right, err := parseNext()
		if err != nil {
			return nil, err
		}

		left = &BinaryNode{Operator: token.Type, Left: left, Right: right}
	}

	return left, nil
}

// Calc evaluates a math expression and returns the result
func Calc(expression string) (float64, error) {
	// Trim whitespace
	expression = strings.TrimSpace(expression)

	// Tokenize
	tokens, err := Tokenize(expression)
	if err != nil {
		return 0, err
	}

	// Parse
	parser := NewParser(tokens)
	ast, err := parser.Parse()
	if err != nil {
		return 0, err
	}

	// Evaluate
	return ast.Evaluate()
}
