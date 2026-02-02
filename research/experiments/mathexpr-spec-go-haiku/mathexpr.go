package main

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
)

// Token represents a lexical token
type Token struct {
	Kind  string
	Value string
}

// Token kinds
const (
	TokenNumber  = "number"
	TokenPlus    = "plus"
	TokenMinus   = "minus"
	TokenStar    = "star"
	TokenSlash   = "slash"
	TokenPercent = "percent"
	TokenPower   = "power"
	TokenLParen  = "lparen"
	TokenRParen  = "rparen"
)

// AstNode represents a node in the abstract syntax tree
type AstNode interface {
	// marker interface
}

// NumberLiteral represents a numeric constant
type NumberLiteral struct {
	Value float64
}

// UnaryExpr represents a unary operation (only unary minus is supported)
type UnaryExpr struct {
	Op      string  // "-"
	Operand AstNode
}

// BinaryExpr represents a binary operation
type BinaryExpr struct {
	Op    string  // "+", "-", "*", "/", "%", "**"
	Left  AstNode
	Right AstNode
}

// Tokenize converts a string into a sequence of tokens
func Tokenize(input string) ([]Token, error) {
	var tokens []Token
	i := 0

	for i < len(input) {
		ch := input[i]

		// Skip whitespace
		if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
			i++
			continue
		}

		// Parse number
		if unicode.IsDigit(rune(ch)) || (ch == '.' && i+1 < len(input) && unicode.IsDigit(rune(input[i+1]))) || (ch == '.' && i+1 == len(input)) {
			start := i
			hasDot := false

			for i < len(input) && (unicode.IsDigit(rune(input[i])) || input[i] == '.') {
				if input[i] == '.' {
					if hasDot {
						return nil, fmt.Errorf("unexpected character '.' at position %d", i)
					}
					hasDot = true
				}
				i++
			}

			tokens = append(tokens, Token{Kind: TokenNumber, Value: input[start:i]})
			continue
		}

		// Parse operators and parentheses
		switch ch {
		case '+':
			tokens = append(tokens, Token{Kind: TokenPlus, Value: "+"})
			i++
		case '-':
			tokens = append(tokens, Token{Kind: TokenMinus, Value: "-"})
			i++
		case '*':
			if i+1 < len(input) && input[i+1] == '*' {
				tokens = append(tokens, Token{Kind: TokenPower, Value: "**"})
				i += 2
			} else {
				tokens = append(tokens, Token{Kind: TokenStar, Value: "*"})
				i++
			}
		case '/':
			tokens = append(tokens, Token{Kind: TokenSlash, Value: "/"})
			i++
		case '%':
			tokens = append(tokens, Token{Kind: TokenPercent, Value: "%"})
			i++
		case '(':
			tokens = append(tokens, Token{Kind: TokenLParen, Value: "("})
			i++
		case ')':
			tokens = append(tokens, Token{Kind: TokenRParen, Value: ")"})
			i++
		default:
			return nil, fmt.Errorf("unexpected character '%c' at position %d", ch, i)
		}
	}

	return tokens, nil
}

// Parser holds state for parsing
type Parser struct {
	tokens []Token
	pos    int
}

// Parse converts a token sequence into an AST
func Parse(tokens []Token) (AstNode, error) {
	if len(tokens) == 0 {
		return nil, fmt.Errorf("unexpected end of input")
	}

	p := &Parser{tokens: tokens, pos: 0}
	expr, err := p.parseExpression()
	if err != nil {
		return nil, err
	}

	if p.pos < len(p.tokens) {
		return nil, fmt.Errorf("unexpected token after expression")
	}

	return expr, nil
}

func (p *Parser) parseExpression() (AstNode, error) {
	return p.parseAdditive()
}

func (p *Parser) parseAdditive() (AstNode, error) {
	left, err := p.parseMultiplicative()
	if err != nil {
		return nil, err
	}

	for p.pos < len(p.tokens) && (p.tokens[p.pos].Kind == TokenPlus || p.tokens[p.pos].Kind == TokenMinus) {
		op := p.tokens[p.pos].Value
		p.pos++

		right, err := p.parseMultiplicative()
		if err != nil {
			return nil, err
		}

		left = &BinaryExpr{Op: op, Left: left, Right: right}
	}

	return left, nil
}

func (p *Parser) parseMultiplicative() (AstNode, error) {
	left, err := p.parsePower()
	if err != nil {
		return nil, err
	}

	for p.pos < len(p.tokens) && (p.tokens[p.pos].Kind == TokenStar || p.tokens[p.pos].Kind == TokenSlash || p.tokens[p.pos].Kind == TokenPercent) {
		op := p.tokens[p.pos].Value
		p.pos++

		right, err := p.parsePower()
		if err != nil {
			return nil, err
		}

		left = &BinaryExpr{Op: op, Left: left, Right: right}
	}

	return left, nil
}

func (p *Parser) parsePower() (AstNode, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}

	if p.pos < len(p.tokens) && p.tokens[p.pos].Kind == TokenPower {
		op := p.tokens[p.pos].Value
		p.pos++

		right, err := p.parsePower() // Right associative
		if err != nil {
			return nil, err
		}

		left = &BinaryExpr{Op: op, Left: left, Right: right}
	}

	return left, nil
}

func (p *Parser) parseUnary() (AstNode, error) {
	if p.pos < len(p.tokens) && p.tokens[p.pos].Kind == TokenMinus {
		p.pos++

		operand, err := p.parseUnary() // Right associative
		if err != nil {
			return nil, err
		}

		return &UnaryExpr{Op: "-", Operand: operand}, nil
	}

	return p.parseAtom()
}

func (p *Parser) parseAtom() (AstNode, error) {
	if p.pos >= len(p.tokens) {
		return nil, fmt.Errorf("unexpected end of input")
	}

	token := p.tokens[p.pos]

	if token.Kind == TokenNumber {
		p.pos++
		val, err := strconv.ParseFloat(token.Value, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number: %s", token.Value)
		}
		return &NumberLiteral{Value: val}, nil
	}

	if token.Kind == TokenLParen {
		p.pos++
		expr, err := p.parseExpression()
		if err != nil {
			return nil, err
		}

		if p.pos >= len(p.tokens) || p.tokens[p.pos].Kind != TokenRParen {
			return nil, fmt.Errorf("expected rparen")
		}

		p.pos++
		return expr, nil
	}

	return nil, fmt.Errorf("unexpected token: %s", token.Kind)
}

// Evaluate evaluates an AST node to a numeric value
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
	default:
		return 0, fmt.Errorf("unknown AST node type")
	}
}

// Calc is the end-to-end function: expression string -> number
func Calc(expression string) (float64, error) {
	trimmed := strings.TrimSpace(expression)
	if trimmed == "" {
		return 0, fmt.Errorf("empty expression")
	}

	tokens, err := Tokenize(expression)
	if err != nil {
		return 0, err
	}

	if len(tokens) == 0 {
		return 0, fmt.Errorf("empty expression")
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
