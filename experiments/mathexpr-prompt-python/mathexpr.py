"""
Math expression evaluator.

Pipeline: tokenize -> parse (recursive descent) -> evaluate AST.
"""

from __future__ import annotations
from enum import Enum, auto
from typing import List


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

class TokenKind(Enum):
    NUMBER = auto()
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    PERCENT = auto()
    DOUBLESTAR = auto()
    LPAREN = auto()
    RPAREN = auto()
    EOF = auto()


class Token:
    __slots__ = ("kind", "value")

    def __init__(self, kind: TokenKind, value: str = "") -> None:
        self.kind = kind
        self.value = value

    def __repr__(self) -> str:
        return f"Token({self.kind}, {self.value!r})"


def tokenize(expr: str) -> List[Token]:
    tokens: List[Token] = []
    i = 0
    n = len(expr)

    while i < n:
        ch = expr[i]

        # whitespace
        if ch in " \t\r\n":
            i += 1
            continue

        # numbers: digits or leading dot for decimals like .5
        if ch.isdigit() or (ch == "." and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            has_dot = ch == "."
            i += 1
            while i < n and (expr[i].isdigit() or (expr[i] == "." and not has_dot)):
                if expr[i] == ".":
                    has_dot = True
                i += 1
            tokens.append(Token(TokenKind.NUMBER, expr[start:i]))
            continue

        # two-char operator **
        if ch == "*" and i + 1 < n and expr[i + 1] == "*":
            tokens.append(Token(TokenKind.DOUBLESTAR, "**"))
            i += 2
            continue

        simple = {
            "+": TokenKind.PLUS,
            "-": TokenKind.MINUS,
            "*": TokenKind.STAR,
            "/": TokenKind.SLASH,
            "%": TokenKind.PERCENT,
            "(": TokenKind.LPAREN,
            ")": TokenKind.RPAREN,
        }

        if ch in simple:
            tokens.append(Token(simple[ch], ch))
            i += 1
            continue

        raise ValueError(f"Invalid character: {ch!r}")

    tokens.append(Token(TokenKind.EOF))
    return tokens


# ---------------------------------------------------------------------------
# AST nodes
# ---------------------------------------------------------------------------

class Num:
    __slots__ = ("value",)

    def __init__(self, value: float) -> None:
        self.value = value


class UnaryOp:
    __slots__ = ("op", "operand")

    def __init__(self, op: str, operand) -> None:
        self.op = op
        self.operand = operand


class BinOp:
    __slots__ = ("left", "op", "right")

    def __init__(self, left, op: str, right) -> None:
        self.left = left
        self.op = op
        self.right = right


# ---------------------------------------------------------------------------
# Parser — recursive descent
# ---------------------------------------------------------------------------

class Parser:
    def __init__(self, tokens: List[Token]) -> None:
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> Token:
        return self.tokens[self.pos]

    def advance(self) -> Token:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, kind: TokenKind) -> Token:
        tok = self.advance()
        if tok.kind != kind:
            raise ValueError(f"Expected {kind}, got {tok.kind}")
        return tok

    # entry
    def parse(self):
        node = self.expr()
        if self.peek().kind != TokenKind.EOF:
            raise ValueError("Unexpected token after expression")
        return node

    # expr -> term (('+' | '-') term)*
    def expr(self):
        node = self.term()
        while self.peek().kind in (TokenKind.PLUS, TokenKind.MINUS):
            op = self.advance().value
            right = self.term()
            node = BinOp(node, op, right)
        return node

    # term -> exponent (('*' | '/' | '%') exponent)*
    def term(self):
        node = self.exponent()
        while self.peek().kind in (TokenKind.STAR, TokenKind.SLASH, TokenKind.PERCENT):
            op = self.advance().value
            right = self.exponent()
            node = BinOp(node, op, right)
        return node

    # exponent -> unary ('**' exponent)?   (right-associative via recursion)
    def exponent(self):
        node = self.unary()
        if self.peek().kind == TokenKind.DOUBLESTAR:
            self.advance()
            right = self.exponent()  # right-recursive for right-assoc
            node = BinOp(node, "**", right)
        return node

    # unary -> '-' unary | primary
    def unary(self):
        if self.peek().kind == TokenKind.MINUS:
            self.advance()
            operand = self.unary()
            return UnaryOp("-", operand)
        return self.primary()

    # primary -> NUMBER | '(' expr ')'
    def primary(self):
        tok = self.peek()
        if tok.kind == TokenKind.NUMBER:
            self.advance()
            return Num(float(tok.value))
        if tok.kind == TokenKind.LPAREN:
            self.advance()
            node = self.expr()
            self.expect(TokenKind.RPAREN)
            return node
        raise ValueError(f"Unexpected token: {tok}")


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------

def evaluate(node) -> float:
    if isinstance(node, Num):
        return node.value
    if isinstance(node, UnaryOp):
        val = evaluate(node.operand)
        if node.op == "-":
            return -val
        raise ValueError(f"Unknown unary op: {node.op}")
    if isinstance(node, BinOp):
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
                raise ZeroDivisionError("Division by zero")
            return left / right
        if node.op == "%":
            if right == 0:
                raise ZeroDivisionError("Modulo by zero")
            return left % right
        if node.op == "**":
            return left ** right
        raise ValueError(f"Unknown binary op: {node.op}")
    raise ValueError(f"Unknown node type: {type(node)}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calc(expression: str) -> float:
    """Evaluate a math expression string and return the numeric result."""
    if not expression or not expression.strip():
        raise ValueError("Empty input")
    tokens = tokenize(expression)
    parser = Parser(tokens)
    tree = parser.parse()
    return evaluate(tree)
