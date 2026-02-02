"""Math expression parser and evaluator."""

from dataclasses import dataclass
from typing import List, Union, Dict, Any


@dataclass
class Token:
    """A lexical token."""
    kind: str
    value: str


# AST Node builders
def number_literal(value: float) -> Dict[str, Any]:
    """Create a number literal AST node."""
    return {"type": "number", "value": value}


def unary_expr(op: str, operand: Dict[str, Any]) -> Dict[str, Any]:
    """Create a unary expression AST node."""
    return {"type": "unary", "op": op, "operand": operand}


def binary_expr(op: str, left: Dict[str, Any], right: Dict[str, Any]) -> Dict[str, Any]:
    """Create a binary expression AST node."""
    return {"type": "binary", "op": op, "left": left, "right": right}


def tokenize(input_str: str) -> List[Token]:
    """Convert a math expression string into a sequence of tokens."""
    tokens = []
    i = 0
    length = len(input_str)
    
    while i < length:
        char = input_str[i]
        
        # Skip whitespace
        if char in ' \t\n\r':
            i += 1
            continue
        
        # Number
        if char.isdigit() or char == '.':
            num_str = ''
            has_dot = False
            
            while i < length and (input_str[i].isdigit() or input_str[i] == '.'):
                if input_str[i] == '.':
                    if has_dot:
                        raise ValueError(f"Unexpected character `.` at position {i}")
                    has_dot = True
                num_str += input_str[i]
                i += 1
            
            tokens.append(Token(kind='number', value=num_str))
            continue
        
        # Two-character operators
        if i + 1 < length and input_str[i:i+2] == '**':
            tokens.append(Token(kind='power', value='**'))
            i += 2
            continue
        
        # Single-character operators and punctuation
        if char == '+':
            tokens.append(Token(kind='plus', value='+'))
            i += 1
        elif char == '-':
            tokens.append(Token(kind='minus', value='-'))
            i += 1
        elif char == '*':
            tokens.append(Token(kind='star', value='*'))
            i += 1
        elif char == '/':
            tokens.append(Token(kind='slash', value='/'))
            i += 1
        elif char == '%':
            tokens.append(Token(kind='percent', value='%'))
            i += 1
        elif char == '(':
            tokens.append(Token(kind='lparen', value='('))
            i += 1
        elif char == ')':
            tokens.append(Token(kind='rparen', value=')'))
            i += 1
        else:
            raise ValueError(f"Unexpected character `{char}` at position {i}")
    
    return tokens


class Parser:
    """Recursive descent parser with precedence climbing."""
    
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
    
    def current_token(self) -> Union[Token, None]:
        """Get the current token without consuming it."""
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def consume(self) -> Union[Token, None]:
        """Consume and return the current token."""
        token = self.current_token()
        if token is not None:
            self.pos += 1
        return token
    
    def expect(self, kind: str) -> Token:
        """Consume a token of the expected kind or raise an error."""
        token = self.current_token()
        if token is None or token.kind != kind:
            if kind == 'rparen':
                raise ValueError("Expected rparen")
            raise ValueError(f"Expected {kind}")
        return self.consume()
    
    def parse(self) -> Dict[str, Any]:
        """Parse the token sequence into an AST."""
        if len(self.tokens) == 0:
            raise ValueError("Unexpected end of input")
        
        ast = self.parse_addition()
        
        if self.current_token() is not None:
            raise ValueError("Unexpected token after expression")
        
        return ast
    
    def parse_addition(self) -> Dict[str, Any]:
        """Parse addition/subtraction (precedence level 1, left-associative)."""
        left = self.parse_multiplication()
        
        while self.current_token() and self.current_token().kind in ('plus', 'minus'):
            op = self.consume().value
            right = self.parse_multiplication()
            left = binary_expr(op, left, right)
        
        return left
    
    def parse_multiplication(self) -> Dict[str, Any]:
        """Parse multiplication/division/modulo (precedence level 2, left-associative)."""
        left = self.parse_power()
        
        while self.current_token() and self.current_token().kind in ('star', 'slash', 'percent'):
            op = self.consume().value
            right = self.parse_power()
            left = binary_expr(op, left, right)
        
        return left
    
    def parse_power(self) -> Dict[str, Any]:
        """Parse exponentiation (precedence level 3, right-associative)."""
        left = self.parse_unary()
        
        if self.current_token() and self.current_token().kind == 'power':
            op = self.consume().value
            right = self.parse_power()  # Right-associative: recurse into power
            return binary_expr(op, left, right)
        
        return left
    
    def parse_unary(self) -> Dict[str, Any]:
        """Parse unary operators (precedence level 4, right-associative)."""
        if self.current_token() and self.current_token().kind == 'minus':
            self.consume()
            operand = self.parse_unary()  # Right-associative: recurse into unary
            return unary_expr('-', operand)
        
        return self.parse_atom()
    
    def parse_atom(self) -> Dict[str, Any]:
        """Parse atoms: numbers and parenthesized expressions."""
        token = self.current_token()
        
        if token is None:
            raise ValueError("Unexpected end of input")
        
        if token.kind == 'number':
            self.consume()
            return number_literal(float(token.value))
        
        if token.kind == 'lparen':
            self.consume()
            ast = self.parse_addition()
            self.expect('rparen')
            return ast
        
        raise ValueError(f"Unexpected token: {token.kind}")


def parse(tokens: List[Token]) -> Dict[str, Any]:
    """Parse a token sequence into an AST."""
    parser = Parser(tokens)
    return parser.parse()


def evaluate(ast: Dict[str, Any]) -> float:
    """Evaluate an AST node to a numeric result."""
    node_type = ast.get('type')
    
    if node_type == 'number':
        return ast['value']
    
    if node_type == 'unary':
        op = ast['op']
        operand = evaluate(ast['operand'])
        if op == '-':
            return -operand
        raise ValueError(f"Unknown unary operator: {op}")
    
    if node_type == 'binary':
        op = ast['op']
        left = evaluate(ast['left'])
        right = evaluate(ast['right'])
        
        if op == '+':
            return left + right
        elif op == '-':
            return left - right
        elif op == '*':
            return left * right
        elif op == '/':
            if right == 0:
                raise ValueError("Division by zero")
            return left / right
        elif op == '%':
            if right == 0:
                raise ValueError("Modulo by zero")
            return left % right
        elif op == '**':
            return left ** right
        else:
            raise ValueError(f"Unknown binary operator: {op}")
    
    raise ValueError(f"Unknown AST node type: {node_type}")


def calc(expression: str) -> float:
    """End-to-end: parse and evaluate a math expression string."""
    if not expression or expression.isspace():
        raise ValueError("Empty expression")
    
    tokens = tokenize(expression)
    if not tokens:
        raise ValueError("Empty expression")
    
    ast = parse(tokens)
    return evaluate(ast)
