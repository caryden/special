"""
Mathexpr — A math expression parser and evaluator.

Pipeline: tokenize -> parse -> evaluate
Public API: calc(expression) -> float
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Union


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass
class Token:
    kind: str
    value: str


@dataclass
class NumberLiteral:
    type: str  # always "number"
    value: float


@dataclass
class UnaryExpr:
    type: str  # always "unary"
    op: str
    operand: AstNode


@dataclass
class BinaryExpr:
    type: str  # always "binary"
    op: str
    left: AstNode
    right: AstNode


AstNode = Union[NumberLiteral, UnaryExpr, BinaryExpr]


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

def tokenize(input_str: str) -> List[Token]:
    tokens: List[Token] = []
    i = 0
    length = len(input_str)

    while i < length:
        ch = input_str[i]

        # Skip whitespace
        if ch in (' ', '\t', '\n', '\r'):
            i += 1
            continue

        # Numbers
        if ch.isdigit() or ch == '.':
            start = i
            has_dot = False
            while i < length and (input_str[i].isdigit() or input_str[i] == '.'):
                if input_str[i] == '.':
                    if has_dot:
                        raise ValueError(f"Unexpected character `.`")
                    has_dot = True
                i += 1
            tokens.append(Token("number", input_str[start:i]))
            continue

        # Two-character operators
        if ch == '*' and i + 1 < length and input_str[i + 1] == '*':
            tokens.append(Token("power", "**"))
            i += 2
            continue

        # Single-character operators and parens
        single = {
            '+': 'plus',
            '-': 'minus',
            '*': 'star',
            '/': 'slash',
            '%': 'percent',
            '(': 'lparen',
            ')': 'rparen',
        }
        if ch in single:
            tokens.append(Token(single[ch], ch))
            i += 1
            continue

        raise ValueError(f"Unexpected character `{ch}` at position {i}")

    return tokens


# ---------------------------------------------------------------------------
# Parser — recursive descent with precedence climbing
# ---------------------------------------------------------------------------

class _Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> Token | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self) -> Token:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, kind: str) -> Token:
        tok = self.peek()
        if tok is None:
            raise ValueError(f"Expected {kind} but reached end of input")
        if tok.kind != kind:
            raise ValueError(f"Expected {kind}")
        return self.advance()

    # Level 1: + -  (left-assoc)
    def parse_add(self) -> AstNode:
        left = self.parse_mul()
        while True:
            tok = self.peek()
            if tok is not None and tok.kind in ('plus', 'minus'):
                self.advance()
                right = self.parse_mul()
                left = BinaryExpr("binary", tok.value, left, right)
            else:
                break
        return left

    # Level 2: * / %  (left-assoc)
    def parse_mul(self) -> AstNode:
        left = self.parse_power()
        while True:
            tok = self.peek()
            if tok is not None and tok.kind in ('star', 'slash', 'percent'):
                self.advance()
                right = self.parse_power()
                left = BinaryExpr("binary", tok.value, left, right)
            else:
                break
        return left

    # Level 3: **  (right-assoc)
    def parse_power(self) -> AstNode:
        base = self.parse_unary()
        tok = self.peek()
        if tok is not None and tok.kind == 'power':
            self.advance()
            exponent = self.parse_power()  # right-recursive
            return BinaryExpr("binary", "**", base, exponent)
        return base

    # Level 4: unary -
    def parse_unary(self) -> AstNode:
        tok = self.peek()
        if tok is not None and tok.kind == 'minus':
            self.advance()
            operand = self.parse_unary()  # chain: --5
            return UnaryExpr("unary", "-", operand)
        return self.parse_atom()

    # Level 5: numbers and (expr)
    def parse_atom(self) -> AstNode:
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of input")

        if tok.kind == 'number':
            self.advance()
            return NumberLiteral("number", float(tok.value))

        if tok.kind == 'lparen':
            self.advance()
            node = self.parse_add()
            self.expect('rparen')
            return node

        raise ValueError(f"Unexpected token: {tok.kind}")


def parse(tokens: List[Token]) -> AstNode:
    if not tokens:
        raise ValueError("Unexpected end of input")
    parser = _Parser(tokens)
    ast = parser.parse_add()
    if parser.pos < len(parser.tokens):
        raise ValueError("Unexpected token after expression")
    return ast


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------

def evaluate(node: AstNode) -> float:
    if isinstance(node, NumberLiteral):
        return node.value

    if isinstance(node, UnaryExpr):
        return -evaluate(node.operand)

    if isinstance(node, BinaryExpr):
        left = evaluate(node.left)
        right = evaluate(node.right)
        if node.op == '+':
            return left + right
        if node.op == '-':
            return left - right
        if node.op == '*':
            return left * right
        if node.op == '/':
            if right == 0:
                raise ValueError("Division by zero")
            return left / right
        if node.op == '%':
            if right == 0:
                raise ValueError("Modulo by zero")
            return left % right
        if node.op == '**':
            return left ** right

    raise ValueError(f"Unknown node: {node}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calc(expression: str) -> float:
    tokens = tokenize(expression)
    if not tokens:
        raise ValueError("Empty expression")
    ast = parse(tokens)
    return evaluate(ast)
