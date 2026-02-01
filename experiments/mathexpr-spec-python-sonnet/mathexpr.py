"""Math expression parser and evaluator."""

from dataclasses import dataclass
from typing import Union


# ============================================================================
# Types
# ============================================================================

@dataclass
class Token:
    """A lexical token with a kind and string value."""
    kind: str
    value: str


@dataclass
class NumberLiteral:
    """AST node: a numeric literal."""
    type: str = "number"
    value: float = 0.0

    def __init__(self, value: float):
        self.type = "number"
        self.value = value


@dataclass
class UnaryExpr:
    """AST node: unary operator applied to an operand."""
    type: str = "unary"
    op: str = ""
    operand: 'AstNode' = None

    def __init__(self, op: str, operand: 'AstNode'):
        self.type = "unary"
        self.op = op
        self.operand = operand


@dataclass
class BinaryExpr:
    """AST node: binary operator applied to left and right operands."""
    type: str = "binary"
    op: str = ""
    left: 'AstNode' = None
    right: 'AstNode' = None

    def __init__(self, op: str, left: 'AstNode', right: 'AstNode'):
        self.type = "binary"
        self.op = op
        self.left = left
        self.right = right


AstNode = Union[NumberLiteral, UnaryExpr, BinaryExpr]


# ============================================================================
# Tokenizer
# ============================================================================

def tokenize(input: str) -> list[Token]:
    """
    Convert a math expression string into a sequence of tokens.
    
    Skips whitespace, parses numbers (with optional decimal point),
    operators (+, -, *, /, %, **), and parentheses.
    
    Raises ValueError on unrecognized characters.
    """
    tokens = []
    i = 0
    length = len(input)
    
    while i < length:
        ch = input[i]
        
        # Skip whitespace
        if ch in ' \t\n\r':
            i += 1
            continue
        
        # Number: digits and at most one decimal point
        if ch.isdigit() or ch == '.':
            start = i
            has_dot = ch == '.'
            i += 1
            
            while i < length:
                ch = input[i]
                if ch.isdigit():
                    i += 1
                elif ch == '.':
                    if has_dot:
                        raise ValueError(f"Unexpected character {ch}")
                    has_dot = True
                    i += 1
                else:
                    break
            
            tokens.append(Token("number", input[start:i]))
            continue
        
        # Two-character operator: **
        if ch == '*' and i + 1 < length and input[i + 1] == '*':
            tokens.append(Token("power", "**"))
            i += 2
            continue
        
        # Single-character operators and parens
        if ch == '+':
            tokens.append(Token("plus", "+"))
            i += 1
        elif ch == '-':
            tokens.append(Token("minus", "-"))
            i += 1
        elif ch == '*':
            tokens.append(Token("star", "*"))
            i += 1
        elif ch == '/':
            tokens.append(Token("slash", "/"))
            i += 1
        elif ch == '%':
            tokens.append(Token("percent", "%"))
            i += 1
        elif ch == '(':
            tokens.append(Token("lparen", "("))
            i += 1
        elif ch == ')':
            tokens.append(Token("rparen", ")"))
            i += 1
        else:
            raise ValueError(f"Unexpected character {ch} at position {i}")
    
    return tokens


# ============================================================================
# Parser
# ============================================================================

class Parser:
    """Recursive descent parser with precedence climbing."""
    
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0
    
    def current(self) -> Token | None:
        """Get current token without consuming it."""
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def consume(self) -> Token:
        """Consume and return current token."""
        if self.pos >= len(self.tokens):
            raise ValueError("Unexpected end of input")
        token = self.tokens[self.pos]
        self.pos += 1
        return token
    
    def expect(self, kind: str) -> Token:
        """Consume token of expected kind or raise error."""
        if self.pos >= len(self.tokens):
            raise ValueError(f"Expected {kind}")
        token = self.tokens[self.pos]
        if token.kind != kind:
            raise ValueError(f"Expected {kind}")
        self.pos += 1
        return token
    
    def parse_expression(self) -> AstNode:
        """Parse entry point: additive expression (lowest precedence)."""
        if not self.tokens:
            raise ValueError("Unexpected end of input")
        
        expr = self.parse_additive()
        
        # Check for trailing tokens
        if self.pos < len(self.tokens):
            raise ValueError("Unexpected token after expression")
        
        return expr
    
    def parse_additive(self) -> AstNode:
        """Parse + and - (left-associative, precedence 1)."""
        left = self.parse_multiplicative()
        
        while True:
            token = self.current()
            if token and token.kind in ("plus", "minus"):
                op = "+" if token.kind == "plus" else "-"
                self.consume()
                right = self.parse_multiplicative()
                left = BinaryExpr(op, left, right)
            else:
                break
        
        return left
    
    def parse_multiplicative(self) -> AstNode:
        """Parse *, /, % (left-associative, precedence 2)."""
        left = self.parse_power()
        
        while True:
            token = self.current()
            if token and token.kind in ("star", "slash", "percent"):
                op = {"star": "*", "slash": "/", "percent": "%"}[token.kind]
                self.consume()
                right = self.parse_power()
                left = BinaryExpr(op, left, right)
            else:
                break
        
        return left
    
    def parse_power(self) -> AstNode:
        """Parse ** (right-associative, precedence 3)."""
        left = self.parse_unary()
        
        token = self.current()
        if token and token.kind == "power":
            self.consume()
            # Right-associative: recurse into parse_power
            right = self.parse_power()
            return BinaryExpr("**", left, right)
        
        return left
    
    def parse_unary(self) -> AstNode:
        """Parse unary - (prefix, precedence 4)."""
        token = self.current()
        
        if token and token.kind == "minus":
            self.consume()
            operand = self.parse_unary()  # Can chain: --5
            return UnaryExpr("-", operand)
        
        return self.parse_atom()
    
    def parse_atom(self) -> AstNode:
        """Parse atoms: numbers and parenthesized expressions (precedence 5)."""
        token = self.current()
        
        if not token:
            raise ValueError("Unexpected end of input")
        
        # Number literal
        if token.kind == "number":
            self.consume()
            value = float(token.value)
            return NumberLiteral(value)
        
        # Parenthesized expression
        if token.kind == "lparen":
            self.consume()
            expr = self.parse_additive()  # Recurse to lowest precedence
            self.expect("rparen")
            return expr
        
        raise ValueError(f"Unexpected token: {token.kind}")


def parse(tokens: list[Token]) -> AstNode:
    """Parse a token sequence into an AST using recursive descent."""
    parser = Parser(tokens)
    return parser.parse_expression()


# ============================================================================
# Evaluator
# ============================================================================

def evaluate(ast: AstNode) -> float:
    """
    Evaluate an AST node by recursive tree walk.
    
    Raises ValueError on division by zero or modulo by zero.
    """
    if isinstance(ast, NumberLiteral):
        return ast.value
    
    if isinstance(ast, UnaryExpr):
        operand_val = evaluate(ast.operand)
        if ast.op == "-":
            return -operand_val
        raise ValueError(f"Unknown unary operator: {ast.op}")
    
    if isinstance(ast, BinaryExpr):
        left_val = evaluate(ast.left)
        right_val = evaluate(ast.right)
        
        if ast.op == "+":
            return left_val + right_val
        elif ast.op == "-":
            return left_val - right_val
        elif ast.op == "*":
            return left_val * right_val
        elif ast.op == "/":
            if right_val == 0:
                raise ValueError("Division by zero")
            return left_val / right_val
        elif ast.op == "%":
            if right_val == 0:
                raise ValueError("Modulo by zero")
            return left_val % right_val
        elif ast.op == "**":
            return left_val ** right_val
        else:
            raise ValueError(f"Unknown binary operator: {ast.op}")
    
    raise ValueError(f"Unknown AST node type: {type(ast)}")


# ============================================================================
# End-to-End
# ============================================================================

def calc(expression: str) -> float:
    """
    End-to-end: parse and evaluate a math expression string.
    
    Raises ValueError on empty/whitespace-only input or evaluation errors.
    """
    # Check for empty/whitespace-only input
    if not expression or expression.strip() == "":
        raise ValueError("Empty expression")
    
    tokens = tokenize(expression)
    ast = parse(tokens)
    return evaluate(ast)
