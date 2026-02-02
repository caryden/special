"""
Math expression parser and evaluator.

This module implements a complete expression evaluation pipeline:
tokenize → parse → evaluate

Types and functions follow the Type-O reference implementation design.
"""

from dataclasses import dataclass
from typing import Union, List, Optional
from enum import Enum


# ============================================================================
# TOKEN TYPES (token-types.ts equivalent)
# ============================================================================

class TokenKind(str, Enum):
    """Token type enumeration."""
    NUMBER = "number"
    PLUS = "plus"
    MINUS = "minus"
    STAR = "star"
    SLASH = "slash"
    PERCENT = "percent"
    POWER = "power"
    LPAREN = "lparen"
    RPAREN = "rparen"


@dataclass
class Token:
    """A single token from the lexer."""
    kind: TokenKind
    value: str

    def __eq__(self, other):
        """Compare tokens by kind and value."""
        if isinstance(other, Token):
            return self.kind == other.kind and self.value == other.value
        if isinstance(other, dict):
            return self.kind.value == other.get("kind") and self.value == other.get("value")
        return False

    def __repr__(self):
        return f"Token(kind={self.kind.value!r}, value={self.value!r})"


def token(kind: str, value: str) -> Token:
    """Create a Token with the given kind and value."""
    return Token(TokenKind(kind), value)


# ============================================================================
# AST TYPES (ast-types.ts equivalent)
# ============================================================================

@dataclass
class NumberLiteral:
    """AST node representing a numeric literal."""
    type: str = "number"
    value: float = 0.0

    def __eq__(self, other):
        """Compare nodes by type and value."""
        if isinstance(other, NumberLiteral):
            return self.value == other.value
        if isinstance(other, dict):
            return other.get("type") == "number" and self.value == other.get("value")
        return False


@dataclass
class UnaryExpr:
    """AST node representing a unary operation."""
    type: str = "unary"
    op: str = ""
    operand: Optional['AstNode'] = None

    def __eq__(self, other):
        """Compare nodes by structure."""
        if isinstance(other, UnaryExpr):
            return self.op == other.op and self.operand == other.operand
        if isinstance(other, dict):
            return (other.get("type") == "unary" and 
                    self.op == other.get("op") and
                    self.operand == other.get("operand"))
        return False


@dataclass
class BinaryExpr:
    """AST node representing a binary operation."""
    type: str = "binary"
    op: str = ""
    left: Optional['AstNode'] = None
    right: Optional['AstNode'] = None

    def __eq__(self, other):
        """Compare nodes by structure."""
        if isinstance(other, BinaryExpr):
            return (self.op == other.op and 
                    self.left == other.left and
                    self.right == other.right)
        if isinstance(other, dict):
            return (other.get("type") == "binary" and 
                    self.op == other.get("op") and
                    self.left == other.get("left") and
                    self.right == other.get("right"))
        return False


# Type alias for AST nodes
AstNode = Union[NumberLiteral, UnaryExpr, BinaryExpr]


def number_literal(value: float) -> NumberLiteral:
    """Create a NumberLiteral node."""
    return NumberLiteral(type="number", value=value)


def unary_expr(op: str, operand: AstNode) -> UnaryExpr:
    """Create a UnaryExpr node."""
    return UnaryExpr(type="unary", op=op, operand=operand)


def binary_expr(op: str, left: AstNode, right: AstNode) -> BinaryExpr:
    """Create a BinaryExpr node."""
    return BinaryExpr(type="binary", op=op, left=left, right=right)


# ============================================================================
# TOKENIZER (tokenizer.ts equivalent)
# ============================================================================

def tokenize(input_str: str) -> List[Token]:
    """
    Tokenize a math expression string into a list of tokens.
    
    Supports: integers, decimals, operators (+, -, *, /, %, **), parentheses.
    Whitespace is skipped. Throws on unrecognized characters.
    """
    tokens: List[Token] = []
    i = 0

    while i < len(input_str):
        ch = input_str[i]

        # Skip whitespace
        if ch in (' ', '\t', '\n', '\r'):
            i += 1
            continue

        # Parentheses
        if ch == '(':
            tokens.append(token("lparen", "("))
            i += 1
            continue

        if ch == ')':
            tokens.append(token("rparen", ")"))
            i += 1
            continue

        # Plus
        if ch == '+':
            tokens.append(token("plus", "+"))
            i += 1
            continue

        # Minus
        if ch == '-':
            tokens.append(token("minus", "-"))
            i += 1
            continue

        # Star and power
        if ch == '*':
            if i + 1 < len(input_str) and input_str[i + 1] == '*':
                tokens.append(token("power", "**"))
                i += 2
            else:
                tokens.append(token("star", "*"))
                i += 1
            continue

        # Slash
        if ch == '/':
            tokens.append(token("slash", "/"))
            i += 1
            continue

        # Percent
        if ch == '%':
            tokens.append(token("percent", "%"))
            i += 1
            continue

        # Numbers (including decimals)
        if _is_digit(ch) or ch == '.':
            num = ""
            has_dot = False
            while i < len(input_str) and (_is_digit(input_str[i]) or input_str[i] == '.'):
                if input_str[i] == '.':
                    if has_dot:
                        raise ValueError(f"Unexpected character '.' at position {i}")
                    has_dot = True
                num += input_str[i]
                i += 1
            tokens.append(token("number", num))
            continue

        # Unknown character
        raise ValueError(f"Unexpected character '{ch}' at position {i}")

    return tokens


def _is_digit(ch: str) -> bool:
    """Check if a character is a digit."""
    return ch >= '0' and ch <= '9'


# ============================================================================
# PARSER (parser.ts equivalent)
# ============================================================================

def parse(tokens: List[Token]) -> AstNode:
    """
    Parse a list of tokens into an AST using recursive descent.
    
    Operator precedence (lowest to highest):
      1. Addition, subtraction (+, -)
      2. Multiplication, division, modulo (*, /, %)
      3. Exponentiation (**) — right-associative
      4. Unary minus (-)
      5. Atoms: numbers, parenthesized expressions
    """
    pos = [0]  # Use list to allow modification in nested functions

    def peek() -> Optional[Token]:
        """Return current token without consuming."""
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def advance() -> Token:
        """Consume and return current token."""
        t = tokens[pos[0]]
        pos[0] += 1
        return t

    def expect(kind: str) -> Token:
        """Consume a token of the expected kind or raise."""
        t = peek()
        if t is None or t.kind.value != kind:
            got = t.kind.value if t else "end of input"
            raise ValueError(f"Expected {kind} but got {got}")
        return advance()

    def parse_add_sub() -> AstNode:
        """Parse addition and subtraction (left-associative)."""
        left = parse_mul_div()
        while True:
            t = peek()
            if t is None or t.kind.value not in ("plus", "minus"):
                break
            op_token = advance()
            op = "+" if op_token.kind.value == "plus" else "-"
            right = parse_mul_div()
            left = binary_expr(op, left, right)
        return left

    def parse_mul_div() -> AstNode:
        """Parse multiplication, division, and modulo (left-associative)."""
        left = parse_power()
        while True:
            t = peek()
            if t is None or t.kind.value not in ("star", "slash", "percent"):
                break
            op_token = advance()
            if op_token.kind.value == "star":
                op = "*"
            elif op_token.kind.value == "slash":
                op = "/"
            else:  # percent
                op = "%"
            right = parse_power()
            left = binary_expr(op, left, right)
        return left

    def parse_power() -> AstNode:
        """Parse exponentiation (right-associative)."""
        base = parse_unary()
        t = peek()
        if t is not None and t.kind.value == "power":
            advance()
            exponent = parse_power()  # Right-recursive for right-associativity
            return binary_expr("**", base, exponent)
        return base

    def parse_unary() -> AstNode:
        """Parse unary minus."""
        t = peek()
        if t is not None and t.kind.value == "minus":
            advance()
            operand = parse_unary()  # Allow chained unary: --x
            return unary_expr("-", operand)
        return parse_atom()

    def parse_atom() -> AstNode:
        """Parse atomic expressions: numbers and parenthesized expressions."""
        t = peek()

        if t is None:
            raise ValueError("Unexpected end of input")

        if t.kind.value == "number":
            advance()
            return number_literal(float(t.value))

        if t.kind.value == "lparen":
            advance()
            expr = parse_add_sub()
            expect("rparen")
            return expr

        raise ValueError(f"Unexpected token: {t.kind.value} '{t.value}'")

    # Parse the expression
    ast = parse_add_sub()

    # Check for unconsumed tokens
    if pos[0] < len(tokens):
        remaining = tokens[pos[0]]
        raise ValueError(f"Unexpected token after expression: {remaining.kind.value} '{remaining.value}'")

    return ast


# ============================================================================
# EVALUATOR (evaluator.ts equivalent)
# ============================================================================

def evaluate(node: AstNode) -> float:
    """
    Evaluate an AST node to produce a numeric result.
    
    Supports: +, -, *, /, %, ** (power), unary negation.
    Throws on division by zero and modulo by zero.
    """
    if isinstance(node, NumberLiteral):
        return node.value

    if isinstance(node, UnaryExpr):
        return -evaluate(node.operand)

    # Must be BinaryExpr
    left = evaluate(node.left)
    right = evaluate(node.right)

    if node.op == "+":
        return left + right
    if node.op == "-":
        return left - right
    if node.op == "*":
        return left * right
    if node.op == "**":
        return left ** right

    if node.op == "/":
        if right == 0:
            raise ValueError("Division by zero")
        return left / right

    # node.op == "%"
    if right == 0:
        raise ValueError("Modulo by zero")
    return left % right


# ============================================================================
# PUBLIC API (evaluate.ts equivalent)
# ============================================================================

def calc(expression: str) -> float:
    """
    Evaluate a math expression string.
    
    This is the end-to-end public API that composes:
    tokenizer → parser → evaluator
    """
    if expression.strip() == "":
        raise ValueError("Empty expression")
    tokens = tokenize(expression)
    ast = parse(tokens)
    return evaluate(ast)
