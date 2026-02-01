// Package mathexpr implements a math expression parser and evaluator.
//
// It provides a pipeline of Tokenize -> Parse -> Evaluate, composed
// together via the top-level Calc function.
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

// TokenKind represents the type of a lexical token.
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

// Token is a lexical token with a kind and string value.
type Token struct {
	Kind  TokenKind
	Value string
}

// ---------------------------------------------------------------------------
// AST node types
// ---------------------------------------------------------------------------

// Node is the interface implemented by all AST nodes.
type Node interface {
	nodeTag()
}

// NumberLiteral is a leaf node holding a numeric value.
type NumberLiteral struct {
	Value float64
}

func (NumberLiteral) nodeTag() {}

// UnaryExpr is a unary operator applied to an operand (only "-" is supported).
type UnaryExpr struct {
	Op      string
	Operand Node
}

func (UnaryExpr) nodeTag() {}

// BinaryExpr is a binary operator applied to left and right operands.
type BinaryExpr struct {
	Op    string
	Left  Node
	Right Node
}

func (BinaryExpr) nodeTag() {}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

// Tokenize converts a math expression string into a sequence of tokens.
func Tokenize(input string) ([]Token, error) {
	var tokens []Token
	i := 0
	runes := []rune(input)

	for i < len(runes) {
		ch := runes[i]

		// Skip whitespace
		if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
			i++
			continue
		}

		// Numbers: digits or leading dot
		if ch >= '0' && ch <= '9' || ch == '.' {
			start := i
			hasDot := false
			for i < len(runes) && (runes[i] >= '0' && runes[i] <= '9' || runes[i] == '.') {
				if runes[i] == '.' {
					if hasDot {
						return nil, fmt.Errorf("Unexpected character `.`")
					}
					hasDot = true
				}
				i++
			}
			tokens = append(tokens, Token{Kind: TokenNumber, Value: string(runes[start:i])})
			continue
		}

		switch ch {
		case '+':
			tokens = append(tokens, Token{Kind: TokenPlus, Value: "+"})
			i++
		case '-':
			tokens = append(tokens, Token{Kind: TokenMinus, Value: "-"})
			i++
		case '*':
			if i+1 < len(runes) && runes[i+1] == '*' {
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
			return nil, fmt.Errorf("Unexpected character `%c` at position %d", ch, i)
		}
	}

	return tokens, nil
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

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
	tok := p.tokens[p.pos]
	p.pos++
	return tok
}

func (p *parser) expect(kind TokenKind) (Token, error) {
	tok := p.peek()
	if tok == nil {
		return Token{}, fmt.Errorf("Unexpected end of input")
	}
	if tok.Kind != kind {
		return Token{}, fmt.Errorf("Expected %s", kind)
	}
	return p.advance(), nil
}

// Parse converts a token slice into an AST.
func Parse(tokens []Token) (Node, error) {
	if len(tokens) == 0 {
		return nil, fmt.Errorf("Unexpected end of input")
	}
	p := &parser{tokens: tokens}
	node, err := p.parseAddSub()
	if err != nil {
		return nil, err
	}
	if p.peek() != nil {
		return nil, fmt.Errorf("Unexpected token after expression")
	}
	return node, nil
}

// Level 1: + and - (left-associative)
func (p *parser) parseAddSub() (Node, error) {
	left, err := p.parseMulDivMod()
	if err != nil {
		return nil, err
	}
	for {
		tok := p.peek()
		if tok == nil || (tok.Kind != TokenPlus && tok.Kind != TokenMinus) {
			break
		}
		op := p.advance()
		right, err := p.parseMulDivMod()
		if err != nil {
			return nil, err
		}
		left = BinaryExpr{Op: op.Value, Left: left, Right: right}
	}
	return left, nil
}

// Level 2: *, /, % (left-associative)
func (p *parser) parseMulDivMod() (Node, error) {
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

// Level 3: ** (right-associative)
func (p *parser) parsePower() (Node, error) {
	base, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	tok := p.peek()
	if tok != nil && tok.Kind == TokenPower {
		p.advance()
		exp, err := p.parsePower() // right-recursive for right-associativity
		if err != nil {
			return nil, err
		}
		return BinaryExpr{Op: "**", Left: base, Right: exp}, nil
	}
	return base, nil
}

// Level 4: unary - (prefix, right-associative, can chain)
func (p *parser) parseUnary() (Node, error) {
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

// Level 5: atoms — numbers and parenthesized expressions
func (p *parser) parseAtom() (Node, error) {
	tok := p.peek()
	if tok == nil {
		return nil, fmt.Errorf("Unexpected end of input")
	}

	switch tok.Kind {
	case TokenNumber:
		p.advance()
		val, err := strconv.ParseFloat(tok.Value, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number: %s", tok.Value)
		}
		return NumberLiteral{Value: val}, nil

	case TokenLParen:
		p.advance()
		node, err := p.parseAddSub()
		if err != nil {
			return nil, err
		}
		if _, err := p.expect(TokenRParen); err != nil {
			return nil, fmt.Errorf("Expected rparen")
		}
		return node, nil

	default:
		return nil, fmt.Errorf("Unexpected token: %s", tok.Kind)
	}
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

// Evaluate recursively evaluates an AST node and returns the numeric result.
func Evaluate(node Node) (float64, error) {
	switch n := node.(type) {
	case NumberLiteral:
		return n.Value, nil
	case UnaryExpr:
		val, err := Evaluate(n.Operand)
		if err != nil {
			return 0, err
		}
		return -val, nil
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
			return 0, fmt.Errorf("unknown operator: %s", n.Op)
		}
	default:
		return 0, fmt.Errorf("unknown node type: %T", node)
	}
}

// ---------------------------------------------------------------------------
// Calc — top-level API
// ---------------------------------------------------------------------------

// Calc evaluates a math expression string and returns the numeric result.
// It composes Tokenize, Parse, and Evaluate into a single pipeline.
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
