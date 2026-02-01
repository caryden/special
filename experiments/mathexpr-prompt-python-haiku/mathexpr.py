"""Math expression evaluator with full operator support."""

import re
from enum import Enum, auto
from typing import List, NamedTuple, Union


class TokenType(Enum):
    """Token types for the lexer."""
    NUMBER = auto()
    PLUS = auto()
    MINUS = auto()
    MULTIPLY = auto()
    DIVIDE = auto()
    MODULO = auto()
    POWER = auto()
    LPAREN = auto()
    RPAREN = auto()
    EOF = auto()


class Token(NamedTuple):
    """A token with type and value."""
    type: TokenType
    value: Union[float, None]


class ASTNode:
    """Base class for AST nodes."""
    pass


class NumberNode(ASTNode):
    """AST node for numeric literals."""
    def __init__(self, value: float):
        self.value = value


class BinaryOpNode(ASTNode):
    """AST node for binary operations."""
    def __init__(self, left: ASTNode, op: TokenType, right: ASTNode):
        self.left = left
        self.op = op
        self.right = right


class UnaryOpNode(ASTNode):
    """AST node for unary operations."""
    def __init__(self, op: TokenType, operand: ASTNode):
        self.op = op
        self.operand = operand


class Tokenizer:
    """Converts input string into tokens."""
    
    def __init__(self, expression: str):
        self.expression = expression
        self.pos = 0
    
    def tokenize(self) -> List[Token]:
        """Tokenize the expression."""
        tokens = []
        
        while self.pos < len(self.expression):
            char = self.expression[self.pos]
            
            # Skip whitespace
            if char.isspace():
                self.pos += 1
                continue
            
            # Numbers (including decimals and leading dot)
            if char.isdigit() or (char == '.' and self.pos + 1 < len(self.expression) 
                                   and self.expression[self.pos + 1].isdigit()):
                tokens.append(self._read_number())
                continue
            
            # Two-character operators
            if self.pos + 1 < len(self.expression):
                two_char = self.expression[self.pos:self.pos + 2]
                if two_char == '**':
                    tokens.append(Token(TokenType.POWER, None))
                    self.pos += 2
                    continue
            
            # Single-character operators
            if char == '+':
                tokens.append(Token(TokenType.PLUS, None))
                self.pos += 1
            elif char == '-':
                tokens.append(Token(TokenType.MINUS, None))
                self.pos += 1
            elif char == '*':
                tokens.append(Token(TokenType.MULTIPLY, None))
                self.pos += 1
            elif char == '/':
                tokens.append(Token(TokenType.DIVIDE, None))
                self.pos += 1
            elif char == '%':
                tokens.append(Token(TokenType.MODULO, None))
                self.pos += 1
            elif char == '(':
                tokens.append(Token(TokenType.LPAREN, None))
                self.pos += 1
            elif char == ')':
                tokens.append(Token(TokenType.RPAREN, None))
                self.pos += 1
            else:
                raise ValueError(f"Invalid character: '{char}'")
        
        tokens.append(Token(TokenType.EOF, None))
        return tokens
    
    def _read_number(self) -> Token:
        """Read a number token (integer or decimal)."""
        start = self.pos
        
        # Read digits before decimal point
        while self.pos < len(self.expression) and self.expression[self.pos].isdigit():
            self.pos += 1
        
        # Read decimal point and digits after
        if self.pos < len(self.expression) and self.expression[self.pos] == '.':
            self.pos += 1
            while self.pos < len(self.expression) and self.expression[self.pos].isdigit():
                self.pos += 1
        
        number_str = self.expression[start:self.pos]
        value = float(number_str)
        return Token(TokenType.NUMBER, value)


class Parser:
    """Parses tokens into an Abstract Syntax Tree."""
    
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
    
    def parse(self) -> ASTNode:
        """Parse tokens into an AST."""
        if not self.tokens or self.tokens[0].type == TokenType.EOF:
            raise ValueError("Empty input")
        
        result = self._parse_expression()
        
        if self._current_token().type != TokenType.EOF:
            raise ValueError("Unexpected tokens after expression")
        
        return result
    
    def _parse_expression(self) -> ASTNode:
        """expression: additive"""
        return self._parse_additive()
    
    def _parse_additive(self) -> ASTNode:
        """additive: multiplicative ((PLUS | MINUS) multiplicative)*"""
        left = self._parse_multiplicative()
        
        while self._current_token().type in (TokenType.PLUS, TokenType.MINUS):
            op = self._current_token().type
            self._consume()
            right = self._parse_multiplicative()
            left = BinaryOpNode(left, op, right)
        
        return left
    
    def _parse_multiplicative(self) -> ASTNode:
        """multiplicative: exponential ((MULT | DIV | MOD) exponential)*"""
        left = self._parse_exponential()
        
        while self._current_token().type in (TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO):
            op = self._current_token().type
            self._consume()
            right = self._parse_exponential()
            left = BinaryOpNode(left, op, right)
        
        return left
    
    def _parse_exponential(self) -> ASTNode:
        """exponential: unary (POWER unary)* — right-associative"""
        left = self._parse_unary()
        
        if self._current_token().type == TokenType.POWER:
            op = self._current_token().type
            self._consume()
            # Right-associative: parse the rest recursively
            right = self._parse_exponential()
            return BinaryOpNode(left, op, right)
        
        return left
    
    def _parse_unary(self) -> ASTNode:
        """unary: (MINUS)* primary"""
        if self._current_token().type == TokenType.MINUS:
            self._consume()
            operand = self._parse_unary()  # Allow chaining: --5
            return UnaryOpNode(TokenType.MINUS, operand)
        
        return self._parse_primary()
    
    def _parse_primary(self) -> ASTNode:
        """primary: NUMBER | LPAREN expression RPAREN"""
        token = self._current_token()
        
        if token.type == TokenType.NUMBER:
            self._consume()
            return NumberNode(token.value)
        
        if token.type == TokenType.LPAREN:
            self._consume()
            expr = self._parse_expression()
            if self._current_token().type != TokenType.RPAREN:
                raise ValueError("Unmatched '(' - missing ')'")
            self._consume()
            return expr
        
        raise ValueError(f"Unexpected token: {token.type}")
    
    def _current_token(self) -> Token:
        """Get current token."""
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return Token(TokenType.EOF, None)
    
    def _consume(self) -> None:
        """Move to next token."""
        self.pos += 1


class Evaluator:
    """Evaluates an AST."""
    
    def evaluate(self, node: ASTNode) -> float:
        """Evaluate an AST node."""
        if isinstance(node, NumberNode):
            return node.value
        
        if isinstance(node, UnaryOpNode):
            operand = self.evaluate(node.operand)
            if node.op == TokenType.MINUS:
                return -operand
            raise ValueError(f"Unknown unary operator: {node.op}")
        
        if isinstance(node, BinaryOpNode):
            left = self.evaluate(node.left)
            right = self.evaluate(node.right)
            
            if node.op == TokenType.PLUS:
                return left + right
            elif node.op == TokenType.MINUS:
                return left - right
            elif node.op == TokenType.MULTIPLY:
                return left * right
            elif node.op == TokenType.DIVIDE:
                if right == 0:
                    raise ValueError("Division by zero")
                return left / right
            elif node.op == TokenType.MODULO:
                if right == 0:
                    raise ValueError("Modulo by zero")
                return left % right
            elif node.op == TokenType.POWER:
                return left ** right
            else:
                raise ValueError(f"Unknown binary operator: {node.op}")
        
        raise ValueError(f"Unknown AST node type: {type(node)}")


def calc(expression: str) -> float:
    """
    Evaluate a math expression and return the result.
    
    Supports: +, -, *, /, %, **, unary -, parentheses, decimals
    
    Args:
        expression: A string containing the math expression
        
    Returns:
        The numeric result of the expression
        
    Raises:
        ValueError: For invalid input, malformed expressions, or division by zero
    """
    expression = expression.strip()
    
    if not expression:
        raise ValueError("Empty input")
    
    # Tokenize
    tokenizer = Tokenizer(expression)
    tokens = tokenizer.tokenize()
    
    # Parse
    parser = Parser(tokens)
    ast = parser.parse()
    
    # Evaluate
    evaluator = Evaluator()
    return evaluator.evaluate(ast)
