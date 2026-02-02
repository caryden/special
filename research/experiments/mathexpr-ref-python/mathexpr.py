"""
Math expression parser and evaluator.

Pipeline: tokenize -> parse -> evaluate

Translated from the Type-O reference implementation (TypeScript).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


# ---------------------------------------------------------------------------
# token-types
# ---------------------------------------------------------------------------

@dataclass
class Token:
    kind: str  # "number"|"plus"|"minus"|"star"|"slash"|"percent"|"power"|"lparen"|"rparen"
    value: str


def token(kind: str, value: str) -> Token:
    return Token(kind=kind, value=value)


# ---------------------------------------------------------------------------
# ast-types
# ---------------------------------------------------------------------------

@dataclass
class NumberLiteral:
    type: str  # always "number"
    value: float


@dataclass
class UnaryExpr:
    type: str  # always "unary"
    op: str
    operand: "AstNode"


@dataclass
class BinaryExpr:
    type: str  # always "binary"
    op: str
    left: "AstNode"
    right: "AstNode"


AstNode = NumberLiteral | UnaryExpr | BinaryExpr


def number_literal(value: float) -> NumberLiteral:
    return NumberLiteral(type="number", value=value)


def unary_expr(op: str, operand: AstNode) -> UnaryExpr:
    return UnaryExpr(type="unary", op=op, operand=operand)


def binary_expr(op: str, left: AstNode, right: AstNode) -> BinaryExpr:
    return BinaryExpr(type="binary", op=op, left=left, right=right)


# ---------------------------------------------------------------------------
# tokenizer
# ---------------------------------------------------------------------------

def _is_digit(ch: str) -> bool:
    return "0" <= ch <= "9"


def tokenize(input_str: str) -> List[Token]:
    tokens: List[Token] = []
    i = 0

    while i < len(input_str):
        ch = input_str[i]

        if ch in (" ", "\t", "\n", "\r"):
            i += 1
            continue

        if ch == "(":
            tokens.append(token("lparen", "("))
            i += 1
            continue

        if ch == ")":
            tokens.append(token("rparen", ")"))
            i += 1
            continue

        if ch == "+":
            tokens.append(token("plus", "+"))
            i += 1
            continue

        if ch == "-":
            tokens.append(token("minus", "-"))
            i += 1
            continue

        if ch == "*":
            if i + 1 < len(input_str) and input_str[i + 1] == "*":
                tokens.append(token("power", "**"))
                i += 2
            else:
                tokens.append(token("star", "*"))
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

        if _is_digit(ch) or ch == ".":
            num = ""
            has_dot = False
            while i < len(input_str) and (_is_digit(input_str[i]) or input_str[i] == "."):
                if input_str[i] == ".":
                    if has_dot:
                        raise ValueError(f"Unexpected character '.' at position {i}")
                    has_dot = True
                num += input_str[i]
                i += 1
            tokens.append(token("number", num))
            continue

        raise ValueError(f"Unexpected character '{ch}' at position {i}")

    return tokens


# ---------------------------------------------------------------------------
# parser
# ---------------------------------------------------------------------------

def parse(tokens: List[Token]) -> AstNode:
    pos = 0

    def peek() -> Optional[Token]:
        nonlocal pos
        if pos < len(tokens):
            return tokens[pos]
        return None

    def advance() -> Token:
        nonlocal pos
        t = tokens[pos]
        pos += 1
        return t

    def expect(kind: str) -> Token:
        t = peek()
        if t is None or t.kind != kind:
            got = t.kind if t else "end of input"
            raise ValueError(f"Expected {kind} but got {got}")
        return advance()

    # Level 1: addition and subtraction (lowest precedence)
    def parse_add_sub() -> AstNode:
        left = parse_mul_div()
        while True:
            t = peek()
            if t is None:
                break
            if t.kind == "plus":
                advance()
                right = parse_mul_div()
                left = binary_expr("+", left, right)
            elif t.kind == "minus":
                advance()
                right = parse_mul_div()
                left = binary_expr("-", left, right)
            else:
                break
        return left

    # Level 2: multiplication, division, modulo
    def parse_mul_div() -> AstNode:
        left = parse_power()
        while True:
            t = peek()
            if t is None:
                break
            if t.kind == "star":
                advance()
                right = parse_power()
                left = binary_expr("*", left, right)
            elif t.kind == "slash":
                advance()
                right = parse_power()
                left = binary_expr("/", left, right)
            elif t.kind == "percent":
                advance()
                right = parse_power()
                left = binary_expr("%", left, right)
            else:
                break
        return left

    # Level 3: exponentiation (right-associative)
    def parse_power() -> AstNode:
        base = parse_unary()
        t = peek()
        if t is not None and t.kind == "power":
            advance()
            exponent = parse_power()  # right-recursive for right-associativity
            return binary_expr("**", base, exponent)
        return base

    # Level 4: unary minus
    def parse_unary() -> AstNode:
        t = peek()
        if t is not None and t.kind == "minus":
            advance()
            operand = parse_unary()  # allow chained unary: --x
            return unary_expr("-", operand)
        return parse_atom()

    # Level 5: atoms - numbers and parenthesized expressions
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

    ast = parse_add_sub()

    if pos < len(tokens):
        remaining = tokens[pos]
        raise ValueError(
            f"Unexpected token after expression: {remaining.kind} '{remaining.value}'"
        )

    return ast


# ---------------------------------------------------------------------------
# evaluator
# ---------------------------------------------------------------------------

def evaluate(node: AstNode) -> float:
    if isinstance(node, NumberLiteral):
        return node.value

    if isinstance(node, UnaryExpr):
        return -evaluate(node.operand)

    # BinaryExpr
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


# ---------------------------------------------------------------------------
# calc (public API)
# ---------------------------------------------------------------------------

def calc(expression: str) -> float:
    """Evaluate a math expression string and return the numeric result."""
    if expression.strip() == "":
        raise ValueError("Empty expression")
    tokens = tokenize(expression)
    ast = parse(tokens)
    return evaluate(ast)
