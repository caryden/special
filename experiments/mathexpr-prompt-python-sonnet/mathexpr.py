"""Math expression evaluator with support for basic arithmetic operations."""

from enum import Enum, auto
from typing import Union


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


class Token:
    """Represents a token in the expression."""
    
    def __init__(self, type_: TokenType, value: Union[float, str, None] = None):
        self.type = type_
        self.value = value
    
    def __repr__(self):
        return f"Token({self.type}, {self.value})"


class Lexer:
    """Tokenizes a math expression string."""
    
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.current_char = self.text[0] if text else None
    
    def error(self, msg: str = "Invalid character"):
        raise ValueError(f"{msg}: '{self.current_char}' at position {self.pos}")
    
    def advance(self):
        """Move to the next character."""
        self.pos += 1
        if self.pos >= len(self.text):
            self.current_char = None
        else:
            self.current_char = self.text[self.pos]
    
    def skip_whitespace(self):
        """Skip whitespace characters."""
        while self.current_char is not None and self.current_char.isspace():
            self.advance()
    
    def read_number(self) -> float:
        """Read a number (integer or decimal)."""
        num_str = ""
        has_dot = False
        
        while self.current_char is not None and (self.current_char.isdigit() or self.current_char == '.'):
            if self.current_char == '.':
                if has_dot:
                    raise ValueError(f"Invalid number format: multiple decimal points at position {self.pos}")
                has_dot = True
            num_str += self.current_char
            self.advance()
        
        if not num_str or num_str == '.':
            raise ValueError(f"Invalid number format at position {self.pos}")
        
        return float(num_str)
    
    def get_next_token(self) -> Token:
        """Get the next token from the input."""
        while self.current_char is not None:
            if self.current_char.isspace():
                self.skip_whitespace()
                continue
            
            if self.current_char.isdigit() or self.current_char == '.':
                return Token(TokenType.NUMBER, self.read_number())
            
            if self.current_char == '+':
                self.advance()
                return Token(TokenType.PLUS)
            
            if self.current_char == '-':
                self.advance()
                return Token(TokenType.MINUS)
            
            if self.current_char == '*':
                self.advance()
                # Check for ** (power operator)
                if self.current_char == '*':
                    self.advance()
                    return Token(TokenType.POWER)
                return Token(TokenType.MULTIPLY)
            
            if self.current_char == '/':
                self.advance()
                return Token(TokenType.DIVIDE)
            
            if self.current_char == '%':
                self.advance()
                return Token(TokenType.MODULO)
            
            if self.current_char == '(':
                self.advance()
                return Token(TokenType.LPAREN)
            
            if self.current_char == ')':
                self.advance()
                return Token(TokenType.RPAREN)
            
            self.error("Invalid character")
        
        return Token(TokenType.EOF)


class Parser:
    """Parses tokens into an abstract syntax tree."""
    
    def __init__(self, lexer: Lexer):
        self.lexer = lexer
        self.current_token = self.lexer.get_next_token()
    
    def error(self, msg: str = "Invalid syntax"):
        raise ValueError(msg)
    
    def eat(self, token_type: TokenType):
        """Consume a token of the given type."""
        if self.current_token.type == token_type:
            self.current_token = self.lexer.get_next_token()
        else:
            self.error(f"Expected {token_type}, got {self.current_token.type}")
    
    def parse(self) -> float:
        """Parse and evaluate the expression."""
        if self.current_token.type == TokenType.EOF:
            raise ValueError("Empty input")
        
        result = self.expression()
        
        if self.current_token.type != TokenType.EOF:
            if self.current_token.type == TokenType.RPAREN:
                raise ValueError("Unmatched parentheses: unexpected closing parenthesis")
            self.error(f"Unexpected token: {self.current_token.type}")
        
        return result
    
    def expression(self) -> float:
        """Handle addition and subtraction (lowest precedence)."""
        result = self.term()
        
        while self.current_token.type in (TokenType.PLUS, TokenType.MINUS):
            token = self.current_token
            if token.type == TokenType.PLUS:
                self.eat(TokenType.PLUS)
                result = result + self.term()
            elif token.type == TokenType.MINUS:
                self.eat(TokenType.MINUS)
                result = result - self.term()
        
        return result
    
    def term(self) -> float:
        """Handle multiplication, division, and modulo."""
        result = self.unary()
        
        while self.current_token.type in (TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO):
            token = self.current_token
            if token.type == TokenType.MULTIPLY:
                self.eat(TokenType.MULTIPLY)
                result = result * self.unary()
            elif token.type == TokenType.DIVIDE:
                self.eat(TokenType.DIVIDE)
                divisor = self.unary()
                if divisor == 0:
                    raise ValueError("Division by zero")
                result = result / divisor
            elif token.type == TokenType.MODULO:
                self.eat(TokenType.MODULO)
                divisor = self.unary()
                if divisor == 0:
                    raise ValueError("Modulo by zero")
                result = result % divisor
        
        return result
    
    def unary(self) -> float:
        """Handle unary minus."""
        token = self.current_token
        
        if token.type == TokenType.MINUS:
            self.eat(TokenType.MINUS)
            return -self.unary()
        
        return self.factor()
    
    def factor(self) -> float:
        """Handle exponentiation (right-associative)."""
        result = self.primary()
        
        if self.current_token.type == TokenType.POWER:
            self.eat(TokenType.POWER)
            # Right-associative: recursively parse the right side
            result = result ** self.unary()
        
        return result
    
    def primary(self) -> float:
        """Handle numbers and parentheses."""
        token = self.current_token
        
        if token.type == TokenType.NUMBER:
            self.eat(TokenType.NUMBER)
            return token.value
        
        if token.type == TokenType.LPAREN:
            self.eat(TokenType.LPAREN)
            result = self.expression()
            if self.current_token.type != TokenType.RPAREN:
                raise ValueError("Unmatched parentheses: missing closing parenthesis")
            self.eat(TokenType.RPAREN)
            return result
        
        # Check for common malformed expression patterns
        if token.type in (TokenType.PLUS, TokenType.MULTIPLY, TokenType.DIVIDE, 
                         TokenType.MODULO, TokenType.POWER):
            raise ValueError(f"Malformed expression: unexpected operator {token.type}")
        
        if token.type == TokenType.RPAREN:
            raise ValueError("Unmatched parentheses: unexpected closing parenthesis")
        
        if token.type == TokenType.EOF:
            raise ValueError("Malformed expression: unexpected end of input")
        
        self.error(f"Unexpected token: {token.type}")


def calc(expression: str) -> float:
    """
    Evaluate a math expression and return the result.
    
    Args:
        expression: A string containing a math expression
        
    Returns:
        The numeric result of evaluating the expression
        
    Raises:
        ValueError: If the expression is invalid or cannot be evaluated
    """
    if not expression or not expression.strip():
        raise ValueError("Empty input")
    
    lexer = Lexer(expression)
    parser = Parser(lexer)
    return parser.parse()
