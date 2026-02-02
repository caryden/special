package mathexpr

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

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

// Token represents a lexical token
type Token struct {
	Kind  string
	Value string
}

// AstNode is the interface for all AST node types
type AstNode interface {
	nodeType() string
}

// NumberLiteral represents a numeric literal
type NumberLiteral struct {
	Value float64
}

func (n NumberLiteral) nodeType() string { return "number" }

// UnaryExpr represents a unary operation
type UnaryExpr struct {
	Op      string
	Operand AstNode
}

func (u UnaryExpr) nodeType() string { return "unary" }

// BinaryExpr represents a binary operation
type BinaryExpr struct {
	Op    string
	Left  AstNode
	Right AstNode
}

func (b BinaryExpr) nodeType() string { return "binary" }

// Tokenize converts a math expression string into tokens
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

		// Numbers
		if (ch >= '0' && ch <= '9') || ch == '.' {
			start := i
			dotCount := 0
			if ch == '.' {
				dotCount = 1
			}
			i++

			for i < len(input) {
				ch := input[i]
				if ch >= '0' && ch <= '9' {
					i++
				} else if ch == '.' {
					dotCount++
					if dotCount > 1 {
						return nil, fmt.Errorf("Unexpected character .")
					}
					i++
				} else {
					break
				}
			}

			tokens = append(tokens, Token{Kind: TokenNumber, Value: input[start:i]})
			continue
		}

		// Operators and parentheses
		if ch == '+' {
			tokens = append(tokens, Token{Kind: TokenPlus, Value: "+"})
			i++
		} else if ch == '-' {
			tokens = append(tokens, Token{Kind: TokenMinus, Value: "-"})
			i++
		} else if ch == '*' {
			// Check for **
			if i+1 < len(input) && input[i+1] == '*' {
				tokens = append(tokens, Token{Kind: TokenPower, Value: "**"})
				i += 2
			} else {
				tokens = append(tokens, Token{Kind: TokenStar, Value: "*"})
				i++
			}
		} else if ch == '/' {
			tokens = append(tokens, Token{Kind: TokenSlash, Value: "/"})
			i++
		} else if ch == '%' {
			tokens = append(tokens, Token{Kind: TokenPercent, Value: "%"})
			i++
		} else if ch == '(' {
			tokens = append(tokens, Token{Kind: TokenLParen, Value: "("})
			i++
		} else if ch == ')' {
			tokens = append(tokens, Token{Kind: TokenRParen, Value: ")"})
			i++
		} else {
			return nil, fmt.Errorf("Unexpected character %c at position %d", ch, i)
		}
	}

	return tokens, nil
}

// parser holds the parser state
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

func (p *parser) advance() {
	p.pos++
}

func (p *parser) expect(kind string) error {
	tok := p.peek()
	if tok == nil {
		return fmt.Errorf("Expected %s", kind)
	}
	if tok.Kind != kind {
		return fmt.Errorf("Expected %s", kind)
	}
	p.advance()
	return nil
}

// Parse parses tokens into an AST
func Parse(tokens []Token) (AstNode, error) {
	if len(tokens) == 0 {
		return nil, fmt.Errorf("Unexpected end of input")
	}

	p := &parser{tokens: tokens, pos: 0}
	ast, err := p.parseAddSub()
	if err != nil {
		return nil, err
	}

	if p.peek() != nil {
		return nil, fmt.Errorf("Unexpected token after expression")
	}

	return ast, nil
}

// parseAddSub handles + and - (lowest precedence)
func (p *parser) parseAddSub() (AstNode, error) {
	left, err := p.parseMulDivMod()
	if err != nil {
		return nil, err
	}

	for {
		tok := p.peek()
		if tok == nil {
			break
		}
		if tok.Kind != TokenPlus && tok.Kind != TokenMinus {
			break
		}

		op := tok.Value
		p.advance()

		right, err := p.parseMulDivMod()
		if err != nil {
			return nil, err
		}

		left = BinaryExpr{Op: op, Left: left, Right: right}
	}

	return left, nil
}

// parseMulDivMod handles *, /, %
func (p *parser) parseMulDivMod() (AstNode, error) {
	left, err := p.parsePower()
	if err != nil {
		return nil, err
	}

	for {
		tok := p.peek()
		if tok == nil {
			break
		}
		if tok.Kind != TokenStar && tok.Kind != TokenSlash && tok.Kind != TokenPercent {
			break
		}

		op := tok.Value
		p.advance()

		right, err := p.parsePower()
		if err != nil {
			return nil, err
		}

		left = BinaryExpr{Op: op, Left: left, Right: right}
	}

	return left, nil
}

// parsePower handles ** (right-associative)
func (p *parser) parsePower() (AstNode, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}

	tok := p.peek()
	if tok != nil && tok.Kind == TokenPower {
		p.advance()
		right, err := p.parsePower() // Right-associative
		if err != nil {
			return nil, err
		}
		return BinaryExpr{Op: "**", Left: left, Right: right}, nil
	}

	return left, nil
}

// parseUnary handles unary minus
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

// parseAtom handles numbers and parenthesized expressions
func (p *parser) parseAtom() (AstNode, error) {
	tok := p.peek()
	if tok == nil {
		return nil, fmt.Errorf("Unexpected end of input")
	}

	if tok.Kind == TokenNumber {
		value, err := strconv.ParseFloat(tok.Value, 64)
		if err != nil {
			return nil, err
		}
		p.advance()
		return NumberLiteral{Value: value}, nil
	}

	if tok.Kind == TokenLParen {
		p.advance()
		expr, err := p.parseAddSub()
		if err != nil {
			return nil, err
		}
		if err := p.expect(TokenRParen); err != nil {
			return nil, fmt.Errorf("Expected rparen")
		}
		return expr, nil
	}

	return nil, fmt.Errorf("Unexpected token: %s", tok.Kind)
}

// Evaluate evaluates an AST node to produce a number
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
		return 0, fmt.Errorf("Unknown node type")
	}
}

// Calc is the public API: parses and evaluates a math expression
func Calc(expression string) (float64, error) {
	// Check for empty/whitespace-only input
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
