"""
Math expression parser and evaluator.

Evaluates strings like "2 + 3 * (4 - 1)" with correct operator precedence,
parentheses, and error handling. Zero external dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Union


# ---------------------------------------------------------------------------
# token-types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Token:
    kind: str  # "number"|"plus"|"minus"|"star"|"slash"|"percent"|"power"|"lparen"|"rparen"
    value: str


# ---------------------------------------------------------------------------
# ast-types
# ---------------------------------------------------------------------------

@dataclass
class NumberLiteral:
    type: str
    value: float

    def __init__(self, value: float) -> None:
        self.type = "number"
        self.value = value


@dataclass
class UnaryExpr:
    type: str
    op: str
    operand: AstNode

    def __init__(self, op: str, operand: AstNode) -> None:
        self.type = "unary"
        self.op = op
        self.operand = operand


@dataclass
class BinaryExpr:
    type: str
    op: str
    left: AstNode
    right: AstNode

    def __init__(self, op: str, left: AstNode, right: AstNode) -> None:
        self.type = "binary"
        self.op = op
        self.left = left
        self.right = right


AstNode = Union[NumberLiteral, UnaryExpr, BinaryExpr]


# ---------------------------------------------------------------------------
# tokenizer
# ---------------------------------------------------------------------------

def tokenize(input_str: str) -> list[Token]:
    """Convert a math expression string into a list of tokens."""
    tokens: list[Token] = []
    i = 0
    n = len(input_str)

    while i < n:
        ch = input_str[i]

        # Skip whitespace
        if ch in (' ', '\t', '\n', '\r'):
            i += 1
            continue

        # Numbers (digits or leading dot)
        if ch.isdigit() or ch == '.':
            start = i
            has_dot = False
            if ch == '.':
                has_dot = True
            i += 1
            while i < n and (input_str[i].isdigit() or input_str[i] == '.'):
                if input_str[i] == '.':
                    if has_dot:
                        raise ValueError(
                            f"Unexpected character '.' at position {i}"
                        )
                    has_dot = True
                i += 1
            tokens.append(Token("number", input_str[start:i]))
            continue

        # Two-character operator: **
        if ch == '*' and i + 1 < n and input_str[i + 1] == '*':
            tokens.append(Token("power", "**"))
            i += 2
            continue

        # Single-character operators and parens
        if ch == '+':
            tokens.append(Token("plus", "+"))
        elif ch == '-':
            tokens.append(Token("minus", "-"))
        elif ch == '*':
            tokens.append(Token("star", "*"))
        elif ch == '/':
            tokens.append(Token("slash", "/"))
        elif ch == '%':
            tokens.append(Token("percent", "%"))
        elif ch == '(':
            tokens.append(Token("lparen", "("))
        elif ch == ')':
            tokens.append(Token("rparen", ")"))
        else:
            raise ValueError(
                f"Unexpected character '{ch}' at position {i}"
            )

        i += 1

    return tokens


# ---------------------------------------------------------------------------
# parser
# ---------------------------------------------------------------------------

def parse(tokens: list[Token]) -> AstNode:
    """Parse a token list into an AST using recursive descent."""
    pos = 0

    def peek() -> Token | None:
        nonlocal pos
        if pos < len(tokens):
            return tokens[pos]
        return None

    def consume() -> Token:
        nonlocal pos
        t = tokens[pos]
        pos += 1
        return t

    def parse_add_sub() -> AstNode:
        node = parse_mul_div()
        while True:
            t = peek()
            if t is None or t.kind not in ("plus", "minus"):
                break
            consume()
            op = "+" if t.kind == "plus" else "-"
            right = parse_mul_div()
            node = BinaryExpr(op, node, right)
        return node

    def parse_mul_div() -> AstNode:
        node = parse_power()
        while True:
            t = peek()
            if t is None or t.kind not in ("star", "slash", "percent"):
                break
            consume()
            if t.kind == "star":
                op = "*"
            elif t.kind == "slash":
                op = "/"
            else:
                op = "%"
            right = parse_power()
            node = BinaryExpr(op, node, right)
        return node

    def parse_power() -> AstNode:
        base = parse_unary()
        t = peek()
        if t is not None and t.kind == "power":
            consume()
            # Right-associative: recurse into parse_power, not parse_unary
            exponent = parse_power()
            return BinaryExpr("**", base, exponent)
        return base

    def parse_unary() -> AstNode:
        t = peek()
        if t is not None and t.kind == "minus":
            consume()
            operand = parse_unary()
            return UnaryExpr("-", operand)
        return parse_atom()

    def parse_atom() -> AstNode:
        t = peek()
        if t is None:
            raise ValueError("Unexpected end of input")

        if t.kind == "number":
            consume()
            return NumberLiteral(float(t.value))

        if t.kind == "lparen":
            consume()
            node = parse_add_sub()
            closing = peek()
            if closing is None or closing.kind != "rparen":
                raise ValueError("Expected rparen")
            consume()
            return node

        raise ValueError(
            f"Unexpected token '{t.kind}' with value '{t.value}'"
        )

    if len(tokens) == 0:
        raise ValueError("Unexpected end of input")

    result = parse_add_sub()

    if pos < len(tokens):
        raise ValueError("Unexpected token after expression")

    return result


# ---------------------------------------------------------------------------
# evaluator
# ---------------------------------------------------------------------------

def evaluate(node: AstNode) -> float:
    """Evaluate an AST node to a numeric result."""
    if isinstance(node, NumberLiteral):
        return node.value

    if isinstance(node, UnaryExpr):
        return -evaluate(node.operand)

    if isinstance(node, BinaryExpr):
        left = evaluate(node.left)
        right = evaluate(node.right)

        if node.op == "+":
            return left + right
        if node.op == "-":
            return left - right
        if node.op == "*":
            return left * right
        if node.op == "/":
            if right == 0:
                raise ValueError("Division by zero")
            return left / right
        if node.op == "%":
            if right == 0:
                raise ValueError("Modulo by zero")
            return left % right
        if node.op == "**":
            return left ** right

    raise ValueError(f"Unknown node type: {type(node)}")


# ---------------------------------------------------------------------------
# evaluate (root: public API)
# ---------------------------------------------------------------------------

def calc(expression: str) -> float:
    """Evaluate a math expression string and return the numeric result."""
    if expression.strip() == "":
        raise ValueError("Empty expression")
    tokens = tokenize(expression)
    ast = parse(tokens)
    return evaluate(ast)
