package main

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
)

// ============================================================================
// Token types
// ============================================================================

type TokenKind string

const (
	TokenNumber TokenKind = "number"
	TokenPlus   TokenKind = "plus"
	TokenMinus  TokenKind = "minus"
	TokenStar   TokenKind = "star"
	TokenSlash  TokenKind = "slash"
	TokenPercent TokenKind = "percent"
	TokenPower  TokenKind = "power"
	TokenLParen TokenKind = "lparen"
	TokenRParen TokenKind = "rparen"
)

type Token struct {
	Kind  TokenKind
	Value string
}

// ============================================================================
// AST types
// ============================================================================

type BinaryOp string

const (
	OpAdd    BinaryOp = "+"
	OpSub    BinaryOp = "-"
	OpMul    BinaryOp = "*"
	OpDiv    BinaryOp = "/"
	OpMod    BinaryOp = "%"
	OpPower  BinaryOp = "**"
)

type UnaryOp string

const (
	OpNeg UnaryOp = "-"
)

// AstNode is the interface for all AST node types
type AstNode interface {
	isAstNode()
}

// NumberLiteral represents a numeric literal
type NumberLiteral struct {
	Value float64
}

func (n *NumberLiteral) isAstNode() {}

// UnaryExpr represents a unary operation
type UnaryExpr struct {
	Op      UnaryOp
	Operand AstNode
}

func (u *UnaryExpr) isAstNode() {}

// BinaryExpr represents a binary operation
type BinaryExpr struct {
	Op    BinaryOp
	Left  AstNode
	Right AstNode
}

func (b *BinaryExpr) isAstNode() {}

// ============================================================================
// Tokenizer
// ============================================================================

func Tokenize(input string) ([]Token, error) {
	var tokens []Token
	i := 0

	for i < len(input) {
		ch := rune(input[i])

		// Skip whitespace
		if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
			i++
			continue
		}

		// Parentheses
		if ch == '(' {
			tokens = append(tokens, Token{TokenLParen, "("})
			i++
			continue
		}

		if ch == ')' {
			tokens = append(tokens, Token{TokenRParen, ")"})
			i++
			continue
		}

		// Single-char operators
		if ch == '+' {
			tokens = append(tokens, Token{TokenPlus, "+"})
			i++
			continue
		}

		if ch == '-' {
			tokens = append(tokens, Token{TokenMinus, "-"})
			i++
			continue
		}

		// Power operator
		if ch == '*' {
			if i+1 < len(input) && input[i+1] == '*' {
				tokens = append(tokens, Token{TokenPower, "**"})
				i += 2
			} else {
				tokens = append(tokens, Token{TokenStar, "*"})
				i++
			}
			continue
		}

		if ch == '/' {
			tokens = append(tokens, Token{TokenSlash, "/"})
			i++
			continue
		}

		if ch == '%' {
			tokens = append(tokens, Token{TokenPercent, "%"})
			i++
			continue
		}

		// Numbers
		if unicode.IsDigit(ch) || ch == '.' {
			num := ""
			hasDot := false
			for i < len(input) && (unicode.IsDigit(rune(input[i])) || input[i] == '.') {
				if input[i] == '.' {
					if hasDot {
						return nil, fmt.Errorf("Unexpected character '.' at position %d", i)
					}
					hasDot = true
				}
				num += string(input[i])
				i++
			}
			tokens = append(tokens, Token{TokenNumber, num})
			continue
		}

		return nil, fmt.Errorf("Unexpected character '%c' at position %d", ch, i)
	}

	return tokens, nil
}

// ============================================================================
// Parser
// ============================================================================

type parser struct {
	tokens []Token
	pos    int
}

func (p *parser) peek() *Token {
	if p.pos < len(p.tokens) {
		return &p.tokens[p.pos]
	}
	return nil
}

func (p *parser) advance() Token {
	t := p.tokens[p.pos]
	p.pos++
	return t
}

func (p *parser) expect(kind TokenKind) (Token, error) {
	t := p.peek()
	if t == nil || t.Kind != kind {
		if t == nil {
			return Token{}, fmt.Errorf("Expected %s but got end of input", kind)
		}
		return Token{}, fmt.Errorf("Expected %s but got %s", kind, t.Kind)
	}
	return p.advance(), nil
}

func (p *parser) parseAddSub() (AstNode, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return nil, err
	}

	for {
		t := p.peek()
		if t == nil || (t.Kind != TokenPlus && t.Kind != TokenMinus) {
			break
		}

		opToken := p.advance()
		var op BinaryOp
		if opToken.Kind == TokenPlus {
			op = OpAdd
		} else {
			op = OpSub
		}

		right, err := p.parseMulDiv()
		if err != nil {
			return nil, err
		}

		left = &BinaryExpr{op, left, right}
	}

	return left, nil
}

func (p *parser) parseMulDiv() (AstNode, error) {
	left, err := p.parsePower()
	if err != nil {
		return nil, err
	}

	for {
		t := p.peek()
		if t == nil || (t.Kind != TokenStar && t.Kind != TokenSlash && t.Kind != TokenPercent) {
			break
		}

		opToken := p.advance()
		var op BinaryOp
		switch opToken.Kind {
		case TokenStar:
			op = OpMul
		case TokenSlash:
			op = OpDiv
		case TokenPercent:
			op = OpMod
		}

		right, err := p.parsePower()
		if err != nil {
			return nil, err
		}

		left = &BinaryExpr{op, left, right}
	}

	return left, nil
}

func (p *parser) parsePower() (AstNode, error) {
	base, err := p.parseUnary()
	if err != nil {
		return nil, err
	}

	t := p.peek()
	if t != nil && t.Kind == TokenPower {
		p.advance()
		exponent, err := p.parsePower() // right-recursive for right-associativity
		if err != nil {
			return nil, err
		}
		return &BinaryExpr{OpPower, base, exponent}, nil
	}

	return base, nil
}

func (p *parser) parseUnary() (AstNode, error) {
	t := p.peek()
	if t != nil && t.Kind == TokenMinus {
		p.advance()
		operand, err := p.parseUnary() // allow chained unary
		if err != nil {
			return nil, err
		}
		return &UnaryExpr{OpNeg, operand}, nil
	}

	return p.parseAtom()
}

func (p *parser) parseAtom() (AstNode, error) {
	t := p.peek()

	if t == nil {
		return nil, errors.New("Unexpected end of input")
	}

	if t.Kind == TokenNumber {
		p.advance()
		val, err := strconv.ParseFloat(t.Value, 64)
		if err != nil {
			return nil, err
		}
		return &NumberLiteral{val}, nil
	}

	if t.Kind == TokenLParen {
		p.advance()
		expr, err := p.parseAddSub()
		if err != nil {
			return nil, err
		}
		_, err = p.expect(TokenRParen)
		if err != nil {
			return nil, err
		}
		return expr, nil
	}

	return nil, fmt.Errorf("Unexpected token: %s '%s'", t.Kind, t.Value)
}

func Parse(tokens []Token) (AstNode, error) {
	p := &parser{tokens, 0}
	ast, err := p.parseAddSub()
	if err != nil {
		return nil, err
	}

	if p.pos < len(p.tokens) {
		remaining := p.tokens[p.pos]
		return nil, fmt.Errorf("Unexpected token after expression: %s '%s'", remaining.Kind, remaining.Value)
	}

	return ast, nil
}

// ============================================================================
// Evaluator
// ============================================================================

func Evaluate(node AstNode) (float64, error) {
	switch n := node.(type) {
	case *NumberLiteral:
		return n.Value, nil

	case *UnaryExpr:
		operand, err := Evaluate(n.Operand)
		if err != nil {
			return 0, err
		}
		return -operand, nil

	case *BinaryExpr:
		left, err := Evaluate(n.Left)
		if err != nil {
			return 0, err
		}
		right, err := Evaluate(n.Right)
		if err != nil {
			return 0, err
		}

		switch n.Op {
		case OpAdd:
			return left + right, nil
		case OpSub:
			return left - right, nil
		case OpMul:
			return left * right, nil
		case OpPower:
			return math.Pow(left, right), nil
		case OpDiv:
			if right == 0 {
				return 0, errors.New("Division by zero")
			}
			return left / right, nil
		case OpMod:
			if right == 0 {
				return 0, errors.New("Modulo by zero")
			}
			// Go's % operator works with floats via int conversion
			// For floating-point modulo, use math.Mod
			return math.Mod(left, right), nil
		default:
			return 0, fmt.Errorf("Unknown operator: %s", n.Op)
		}

	default:
		return 0, errors.New("Unknown AST node type")
	}
}

// ============================================================================
// Public API
// ============================================================================

// Calc evaluates a math expression string and returns the numeric result.
func Calc(expression string) (float64, error) {
	trimmed := strings.TrimSpace(expression)
	if trimmed == "" {
		return 0, errors.New("Empty expression")
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
