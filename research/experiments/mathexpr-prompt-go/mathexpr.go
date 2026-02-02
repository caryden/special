// Package mathexpr evaluates arithmetic expressions from strings.
//
// It supports +, -, *, /, %, ** (right-associative exponentiation),
// unary negation, parentheses, and decimal numbers.
//
// The implementation follows a classic pipeline: tokenize -> parse (recursive
// descent into an AST) -> evaluate.
package mathexpr

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"unicode"
)

// ---- Errors ----------------------------------------------------------------

var (
	ErrEmptyInput          = errors.New("empty input")
	ErrDivisionByZero      = errors.New("division by zero")
	ErrModuloByZero        = errors.New("modulo by zero")
	ErrUnmatchedParen      = errors.New("unmatched parenthesis")
	ErrInvalidCharacter    = errors.New("invalid character")
	ErrMalformedExpression = errors.New("malformed expression")
)

// ---- Tokens ----------------------------------------------------------------

type tokenKind int

const (
	tkNumber tokenKind = iota
	tkPlus
	tkMinus
	tkStar
	tkSlash
	tkPercent
	tkPow    // **
	tkLParen // (
	tkRParen // )
	tkEOF
)

type token struct {
	kind tokenKind
	text string
}

// ---- Tokenizer -------------------------------------------------------------

func tokenize(input string) ([]token, error) {
	var tokens []token
	i := 0
	runes := []rune(input)
	n := len(runes)

	for i < n {
		ch := runes[i]

		// Skip whitespace
		if unicode.IsSpace(ch) {
			i++
			continue
		}

		// Number: digits and dots
		if ch == '.' || unicode.IsDigit(ch) {
			start := i
			dotSeen := false
			for i < n && (unicode.IsDigit(runes[i]) || runes[i] == '.') {
				if runes[i] == '.' {
					if dotSeen {
						return nil, fmt.Errorf("%w: multiple decimal points", ErrMalformedExpression)
					}
					dotSeen = true
				}
				i++
			}
			text := string(runes[start:i])
			// Lone dot is not a number
			if text == "." {
				return nil, fmt.Errorf("%w: lone decimal point", ErrMalformedExpression)
			}
			tokens = append(tokens, token{tkNumber, text})
			continue
		}

		// Two-character operator **
		if ch == '*' && i+1 < n && runes[i+1] == '*' {
			tokens = append(tokens, token{tkPow, "**"})
			i += 2
			continue
		}

		// Single-character operators and parens
		switch ch {
		case '+':
			tokens = append(tokens, token{tkPlus, "+"})
		case '-':
			tokens = append(tokens, token{tkMinus, "-"})
		case '*':
			tokens = append(tokens, token{tkStar, "*"})
		case '/':
			tokens = append(tokens, token{tkSlash, "/"})
		case '%':
			tokens = append(tokens, token{tkPercent, "%"})
		case '(':
			tokens = append(tokens, token{tkLParen, "("})
		case ')':
			tokens = append(tokens, token{tkRParen, ")"})
		default:
			return nil, fmt.Errorf("%w: '%c'", ErrInvalidCharacter, ch)
		}
		i++
	}

	tokens = append(tokens, token{tkEOF, ""})
	return tokens, nil
}

// ---- AST -------------------------------------------------------------------

// Node is the interface implemented by every AST node.
type Node interface {
	eval() (float64, error)
}

// NumberNode holds a literal numeric value.
type NumberNode struct {
	Value float64
}

func (n *NumberNode) eval() (float64, error) { return n.Value, nil }

// UnaryNode represents a unary minus.
type UnaryNode struct {
	Operand Node
}

func (u *UnaryNode) eval() (float64, error) {
	v, err := u.Operand.eval()
	if err != nil {
		return 0, err
	}
	return -v, nil
}

// BinaryNode represents a binary operation.
type BinaryNode struct {
	Op    tokenKind
	Left  Node
	Right Node
}

func (b *BinaryNode) eval() (float64, error) {
	lv, err := b.Left.eval()
	if err != nil {
		return 0, err
	}
	rv, err := b.Right.eval()
	if err != nil {
		return 0, err
	}

	switch b.Op {
	case tkPlus:
		return lv + rv, nil
	case tkMinus:
		return lv - rv, nil
	case tkStar:
		return lv * rv, nil
	case tkSlash:
		if rv == 0 {
			return 0, ErrDivisionByZero
		}
		return lv / rv, nil
	case tkPercent:
		if rv == 0 {
			return 0, ErrModuloByZero
		}
		return math.Mod(lv, rv), nil
	case tkPow:
		return math.Pow(lv, rv), nil
	default:
		return 0, fmt.Errorf("%w: unknown operator", ErrMalformedExpression)
	}
}

// ---- Parser (recursive descent) -------------------------------------------

type parser struct {
	tokens []token
	pos    int
}

func (p *parser) peek() token {
	return p.tokens[p.pos]
}

func (p *parser) advance() token {
	t := p.tokens[p.pos]
	p.pos++
	return t
}

func (p *parser) expect(kind tokenKind) (token, error) {
	t := p.advance()
	if t.kind != kind {
		return t, fmt.Errorf("%w: expected %v, got '%s'", ErrMalformedExpression, kind, t.text)
	}
	return t, nil
}

// Grammar (precedence climbing):
//   expr       = addSub
//   addSub     = mulDiv (('+' | '-') mulDiv)*
//   mulDiv     = power  (('*' | '/' | '%') power)*
//   power      = unary ('**' power)?        // right-associative via recursion
//   unary      = '-' unary | primary
//   primary    = NUMBER | '(' expr ')'

func (p *parser) parseExpr() (Node, error) {
	return p.parseAddSub()
}

func (p *parser) parseAddSub() (Node, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return nil, err
	}
	for p.peek().kind == tkPlus || p.peek().kind == tkMinus {
		op := p.advance()
		right, err := p.parseMulDiv()
		if err != nil {
			return nil, err
		}
		left = &BinaryNode{Op: op.kind, Left: left, Right: right}
	}
	return left, nil
}

func (p *parser) parseMulDiv() (Node, error) {
	left, err := p.parsePower()
	if err != nil {
		return nil, err
	}
	for p.peek().kind == tkStar || p.peek().kind == tkSlash || p.peek().kind == tkPercent {
		op := p.advance()
		right, err := p.parsePower()
		if err != nil {
			return nil, err
		}
		left = &BinaryNode{Op: op.kind, Left: left, Right: right}
	}
	return left, nil
}

func (p *parser) parsePower() (Node, error) {
	base, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	// Right-associative: recurse into parsePower for the exponent
	if p.peek().kind == tkPow {
		p.advance()
		exp, err := p.parsePower()
		if err != nil {
			return nil, err
		}
		return &BinaryNode{Op: tkPow, Left: base, Right: exp}, nil
	}
	return base, nil
}

func (p *parser) parseUnary() (Node, error) {
	if p.peek().kind == tkMinus {
		p.advance()
		operand, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		return &UnaryNode{Operand: operand}, nil
	}
	// Allow unary plus (just consume it)
	if p.peek().kind == tkPlus {
		p.advance()
		return p.parseUnary()
	}
	return p.parsePrimary()
}

func (p *parser) parsePrimary() (Node, error) {
	t := p.peek()

	if t.kind == tkNumber {
		p.advance()
		var val float64
		_, err := fmt.Sscanf(t.text, "%f", &val)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid number '%s'", ErrMalformedExpression, t.text)
		}
		return &NumberNode{Value: val}, nil
	}

	if t.kind == tkLParen {
		p.advance()
		node, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		if _, err := p.expect(tkRParen); err != nil {
			return nil, fmt.Errorf("%w", ErrUnmatchedParen)
		}
		return node, nil
	}

	if t.kind == tkEOF {
		return nil, fmt.Errorf("%w: unexpected end of expression", ErrMalformedExpression)
	}
	return nil, fmt.Errorf("%w: unexpected token '%s'", ErrMalformedExpression, t.text)
}

// ---- Public API ------------------------------------------------------------

// Calc evaluates the given arithmetic expression string and returns the result.
func Calc(expression string) (float64, error) {
	trimmed := strings.TrimSpace(expression)
	if trimmed == "" {
		return 0, ErrEmptyInput
	}

	tokens, err := tokenize(trimmed)
	if err != nil {
		return 0, err
	}

	p := &parser{tokens: tokens}
	ast, err := p.parseExpr()
	if err != nil {
		return 0, err
	}

	// Make sure we consumed everything
	if p.peek().kind != tkEOF {
		return 0, fmt.Errorf("%w: unexpected token '%s' after expression", ErrMalformedExpression, p.peek().text)
	}

	return ast.eval()
}
