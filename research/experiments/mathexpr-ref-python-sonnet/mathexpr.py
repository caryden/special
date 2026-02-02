"""
Math expression parser and evaluator.

A Type-O reference implementation translated from TypeScript.
Supports basic arithmetic with proper operator precedence.
"""

from dataclasses import dataclass
from typing import Literal, Union


# ============================================================================
# Token Types
# ============================================================================

TokenKind = Literal[
    "number", "plus", "minus", "star", "slash", "percent", "power", "lparen", "rparen"
]


@dataclass
class Token:
    """A lexical token from the input string."""
    kind: TokenKind
    value: str


def token(kind: TokenKind, value: str) -> Token:
    """Create a token with the given kind and value."""
    return Token(kind=kind, value=value)


# ============================================================================
# AST Types
# ============================================================================

BinaryOp = Literal["+", "-", "*", "/", "%", "**"]
UnaryOp = Literal["-"]


@dataclass
class NumberLiteral:
    """A numeric literal node."""
    type: Literal["number"] = "number"
    value: float = 0.0


@dataclass
class UnaryExpr:
    """A unary expression node."""
    type: Literal["unary"] = "unary"
    op: UnaryOp = "-"
    operand: "AstNode" = None


@dataclass
class BinaryExpr:
    """A binary expression node."""
    type: Literal["binary"] = "binary"
    op: BinaryOp = "+"
    left: "AstNode" = None
    right: "AstNode" = None


AstNode = Union[NumberLiteral, UnaryExpr, BinaryExpr]


def number_literal(value: float) -> NumberLiteral:
    """Create a number literal AST node."""
    return NumberLiteral(type="number", value=value)


def unary_expr(op: UnaryOp, operand: AstNode) -> UnaryExpr:
    """Create a unary expression AST node."""
    return UnaryExpr(type="unary", op=op, operand=operand)


def binary_expr(op: BinaryOp, left: AstNode, right: AstNode) -> BinaryExpr:
    """Create a binary expression AST node."""
    return BinaryExpr(type="binary", op=op, left=left, right=right)


# ============================================================================
# Tokenizer
# ============================================================================

def tokenize(input_str: str) -> list[Token]:
    """
    Convert a math expression string into a sequence of tokens.
    
    Supports: integers, decimals, operators (+, -, *, /, %, **), parentheses.
    Whitespace is skipped. Raises ValueError on unrecognized characters.
    """
    tokens: list[Token] = []
    i = 0

    while i < len(input_str):
        ch = input_str[i]

        # Skip whitespace
        if ch in " \t\n\r":
            i += 1
            continue

        # Parentheses
        if ch == "(":
            tokens.append(token("lparen", "("))
            i += 1
            continue

        if ch == ")":
            tokens.append(token("rparen", ")"))
            i += 1
            continue

        # Single-character operators
        if ch == "+":
            tokens.append(token("plus", "+"))
            i += 1
            continue

        if ch == "-":
            tokens.append(token("minus", "-"))
            i += 1
            continue

        if ch == "/":
            tokens.append(token("slash", "/"))
            i += 1
            continue

        if ch == "%":
            tokens.append(token("percent", "%"))
            i += 1
            continue

        # Star or power
        if ch == "*":
            if i + 1 < len(input_str) and input_str[i + 1] == "*":
                tokens.append(token("power", "**"))
                i += 2
            else:
                tokens.append(token("star", "*"))
                i += 1
            continue

        # Numbers (including decimals)
        if ch.isdigit() or ch == ".":
            num = ""
            has_dot = False
            while i < len(input_str) and (input_str[i].isdigit() or input_str[i] == "."):
                if input_str[i] == ".":
                    if has_dot:
                        raise ValueError(f"Unexpected character '.' at position {i}")
                    has_dot = True
                num += input_str[i]
                i += 1
            tokens.append(token("number", num))
            continue

        # Unrecognized character
        raise ValueError(f"Unexpected character '{ch}' at position {i}")

    return tokens


# ============================================================================
# Parser
# ============================================================================

def parse(tokens: list[Token]) -> AstNode:
    """
    Parse a sequence of tokens into an AST using recursive descent.
    
    Operator precedence (lowest to highest):
      1. Addition, subtraction (+, -)
      2. Multiplication, division, modulo (*, /, %)
      3. Exponentiation (**)  — right-associative
      4. Unary minus (-)
      5. Atoms: numbers, parenthesized expressions
    """
    pos = 0

    def peek() -> Token | None:
        """Get current token without advancing."""
        return tokens[pos] if pos < len(tokens) else None

    def advance() -> Token:
        """Consume and return current token."""
        nonlocal pos
        t = tokens[pos]
        pos += 1
        return t

    def expect(kind: TokenKind) -> Token:
        """Consume a token of the expected kind, or raise an error."""
        t = peek()
        if t is None or t.kind != kind:
            raise ValueError(f"Expected {kind} but got {t.kind if t else 'end of input'}")
        return advance()

    # Level 1: addition and subtraction (lowest precedence)
    def parse_add_sub() -> AstNode:
        left = parse_mul_div()
        while peek() and peek().kind in ("plus", "minus"):
            op_token = advance()
            op = "+" if op_token.kind == "plus" else "-"
            right = parse_mul_div()
            left = binary_expr(op, left, right)
        return left

    # Level 2: multiplication, division, modulo
    def parse_mul_div() -> AstNode:
        left = parse_power()
        while peek() and peek().kind in ("star", "slash", "percent"):
            op_token = advance()
            if op_token.kind == "star":
                op = "*"
            elif op_token.kind == "slash":
                op = "/"
            else:
                op = "%"
            right = parse_power()
            left = binary_expr(op, left, right)
        return left

    # Level 3: exponentiation (right-associative)
    def parse_power() -> AstNode:
        base = parse_unary()
        if peek() and peek().kind == "power":
            advance()
            exponent = parse_power()  # right-recursive for right-associativity
            return binary_expr("**", base, exponent)
        return base

    # Level 4: unary minus
    def parse_unary() -> AstNode:
        if peek() and peek().kind == "minus":
            advance()
            operand = parse_unary()  # allow chained unary: --x
            return unary_expr("-", operand)
        return parse_atom()

    # Level 5: atoms — numbers and parenthesized expressions
    def parse_atom() -> AstNode:
        t = peek()

        if t is None:
            raise ValueError("Unexpected end of input")

        if t.kind == "number":
            advance()
            return number_literal(float(t.value))

        if t.kind == "lparen":
            advance()
            expr = parse_add_sub()
            expect("rparen")
            return expr

        raise ValueError(f"Unexpected token: {t.kind} '{t.value}'")

    # Parse the expression
    ast = parse_add_sub()

    # Ensure all tokens were consumed
    if pos < len(tokens):
        remaining = tokens[pos]
        raise ValueError(f"Unexpected token after expression: {remaining.kind} '{remaining.value}'")

    return ast


# ============================================================================
# Evaluator
# ============================================================================

def evaluate(node: AstNode) -> float:
    """
    Evaluate an AST node to produce a numeric result.
    
    Supports: +, -, *, /, %, ** (power), unary negation.
    Raises ValueError on division by zero and modulo by zero.
    """
    if node.type == "number":
        return node.value

    if node.type == "unary":
        return -evaluate(node.operand)

    # Binary expression
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
# Public API
# ============================================================================

def calc(expression: str) -> float:
    """
    End-to-end expression evaluation: string in, number out.
    
    Composes tokenizer → parser → evaluator into a single function.
    This is the root node of the library — the public API.
    """
    if expression.strip() == "":
        raise ValueError("Empty expression")
    
    tokens = tokenize(expression)
    ast = parse(tokens)
    return evaluate(ast)
