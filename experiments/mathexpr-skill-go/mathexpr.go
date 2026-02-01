package mathexpr

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// --- token-types ---

// TokenKind represents the type of a token.
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

// Token represents a lexical token with a kind and string value.
type Token struct {
	Kind  TokenKind
	Value string
}

// NewToken creates a new Token.
func NewToken(kind TokenKind, value string) Token {
	return Token{Kind: kind, Value: value}
}

// --- ast-types ---

// AstNode is the interface for all AST node types.
type AstNode interface {
	astNode()
}

// NumberLiteral represents a numeric value in the AST.
type NumberLiteral struct {
	Value float64
}

func (NumberLiteral) astNode() {}

// UnaryExpr represents a unary operation (e.g., negation).
type UnaryExpr struct {
	Op      string
	Operand AstNode
}

func (UnaryExpr) astNode() {}

// BinaryExpr represents a binary operation (e.g., addition).
type BinaryExpr struct {
	Op    string
	Left  AstNode
	Right AstNode
}

func (BinaryExpr) astNode() {}

// --- tokenizer ---

// Tokenize converts a math expression string into a sequence of tokens.
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

		// Numbers: digits or leading dot
		if (ch >= '0' && ch <= '9') || ch == '.' {
			start := i
			hasDot := false
			for i < len(input) && ((input[i] >= '0' && input[i] <= '9') || input[i] == '.') {
				if input[i] == '.' {
					if hasDot {
						return nil, fmt.Errorf("Unexpected character '.' at position %d", i)
					}
					hasDot = true
				}
				i++
			}
			tokens = append(tokens, NewToken(TokenNumber, input[start:i]))
			continue
		}

		// ** (power) — must check before single *
		if ch == '*' && i+1 < len(input) && input[i+1] == '*' {
			tokens = append(tokens, NewToken(TokenPower, "**"))
			i += 2
			continue
		}

		// Single-character operators
		switch ch {
		case '+':
			tokens = append(tokens, NewToken(TokenPlus, "+"))
		case '-':
			tokens = append(tokens, NewToken(TokenMinus, "-"))
		case '*':
			tokens = append(tokens, NewToken(TokenStar, "*"))
		case '/':
			tokens = append(tokens, NewToken(TokenSlash, "/"))
		case '%':
			tokens = append(tokens, NewToken(TokenPercent, "%"))
		case '(':
			tokens = append(tokens, NewToken(TokenLParen, "("))
		case ')':
			tokens = append(tokens, NewToken(TokenRParen, ")"))
		default:
			return nil, fmt.Errorf("Unexpected character '%c' at position %d", ch, i)
		}
		i++
	}
	return tokens, nil
}

// --- parser ---

type parser struct {
	tokens []Token
	pos    int
}

func (p *parser) peek() *Token {
	if p.pos >= len(p.tokens) {
		return nil
	}
	return &p.tokens[p.pos]
}

func (p *parser) advance() Token {
	t := p.tokens[p.pos]
	p.pos++
	return t
}

func (p *parser) expect(kind TokenKind) (Token, error) {
	tok := p.peek()
	if tok == nil {
		return Token{}, fmt.Errorf("Expected %s but reached end of input", kind)
	}
	if tok.Kind != kind {
		return Token{}, fmt.Errorf("Expected %s but got %s:\"%s\"", kind, tok.Kind, tok.Value)
	}
	return p.advance(), nil
}

// parseAddSub handles + and - (precedence level 1, left-associative).
func (p *parser) parseAddSub() (AstNode, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return nil, err
	}
	for {
		tok := p.peek()
		if tok == nil || (tok.Kind != TokenPlus && tok.Kind != TokenMinus) {
			break
		}
		op := p.advance()
		right, err := p.parseMulDiv()
		if err != nil {
			return nil, err
		}
		left = BinaryExpr{Op: op.Value, Left: left, Right: right}
	}
	return left, nil
}

// parseMulDiv handles *, /, % (precedence level 2, left-associative).
func (p *parser) parseMulDiv() (AstNode, error) {
	left, err := p.parsePower()
	if err != nil {
		return nil, err
	}
	for {
		tok := p.peek()
		if tok == nil || (tok.Kind != TokenStar && tok.Kind != TokenSlash && tok.Kind != TokenPercent) {
			break
		}
		op := p.advance()
		right, err := p.parsePower()
		if err != nil {
			return nil, err
		}
		left = BinaryExpr{Op: op.Value, Left: left, Right: right}
	}
	return left, nil
}

// parsePower handles ** (precedence level 3, right-associative).
func (p *parser) parsePower() (AstNode, error) {
	base, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	tok := p.peek()
	if tok != nil && tok.Kind == TokenPower {
		p.advance()
		// Right-associative: recurse into parsePower (same level)
		exp, err := p.parsePower()
		if err != nil {
			return nil, err
		}
		return BinaryExpr{Op: "**", Left: base, Right: exp}, nil
	}
	return base, nil
}

// parseUnary handles unary minus (precedence level 4).
func (p *parser) parseUnary() (AstNode, error) {
	tok := p.peek()
	if tok != nil && tok.Kind == TokenMinus {
		p.advance()
		operand, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		return UnaryExpr{Op: "-", Operand: operand}, nil
	}
	return p.parseAtom()
}

// parseAtom handles numbers and parenthesized expressions (precedence level 5).
func (p *parser) parseAtom() (AstNode, error) {
	tok := p.peek()
	if tok == nil {
		return nil, fmt.Errorf("Unexpected end of input")
	}
	switch tok.Kind {
	case TokenNumber:
		t := p.advance()
		val, err := strconv.ParseFloat(t.Value, 64)
		if err != nil {
			return nil, fmt.Errorf("Invalid number: %s", t.Value)
		}
		return NumberLiteral{Value: val}, nil
	case TokenLParen:
		p.advance() // consume '('
		expr, err := p.parseAddSub()
		if err != nil {
			return nil, err
		}
		_, err = p.expect(TokenRParen)
		if err != nil {
			return nil, fmt.Errorf("Expected rparen")
		}
		return expr, nil
	default:
		return nil, fmt.Errorf("Unexpected token %s:\"%s\"", tok.Kind, tok.Value)
	}
}

// Parse converts a slice of tokens into an AST.
func Parse(tokens []Token) (AstNode, error) {
	if len(tokens) == 0 {
		return nil, fmt.Errorf("Unexpected end of input")
	}
	p := &parser{tokens: tokens, pos: 0}
	node, err := p.parseAddSub()
	if err != nil {
		return nil, err
	}
	if p.pos < len(p.tokens) {
		return nil, fmt.Errorf("Unexpected token after expression")
	}
	return node, nil
}

// --- evaluator ---

// Evaluate walks an AST and computes the numeric result.
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
		case "**":
			return math.Pow(left, right), nil
		default:
			return 0, fmt.Errorf("Unknown operator: %s", n.Op)
		}
	default:
		return 0, fmt.Errorf("Unknown AST node type")
	}
}

// --- evaluate (root: public API) ---

// Calc evaluates a math expression string and returns the numeric result.
func Calc(expression string) (float64, error) {
	trimmed := strings.TrimSpace(expression)
	if trimmed == "" {
		return 0, fmt.Errorf("Empty expression")
	}

	tokens, err := Tokenize(trimmed)
	if err != nil {
		return 0, err
	}

	ast, err := Parse(tokens)
	if err != nil {
		return 0, err
	}

	result, err := Evaluate(ast)
	if err != nil {
		return 0, err
	}

	return result, nil
}
