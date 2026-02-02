//! Math expression parser and evaluator
//! 
//! A pipeline-based implementation: tokenize → parse → evaluate
//! Supports: +, -, *, /, %, ** (power), unary negation, parentheses

use std::fmt;

// ============================================================================
// TOKEN TYPES
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenKind {
    Number,
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Power,
    LParen,
    RParen,
}

impl fmt::Display for TokenKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TokenKind::Number => write!(f, "number"),
            TokenKind::Plus => write!(f, "plus"),
            TokenKind::Minus => write!(f, "minus"),
            TokenKind::Star => write!(f, "star"),
            TokenKind::Slash => write!(f, "slash"),
            TokenKind::Percent => write!(f, "percent"),
            TokenKind::Power => write!(f, "power"),
            TokenKind::LParen => write!(f, "lparen"),
            TokenKind::RParen => write!(f, "rparen"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub kind: TokenKind,
    pub value: String,
}

pub fn token(kind: TokenKind, value: &str) -> Token {
    Token {
        kind,
        value: value.to_string(),
    }
}

// ============================================================================
// AST TYPES
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BinaryOp {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Pow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnaryOp {
    Neg,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AstNode {
    Number(f64),
    Unary {
        op: UnaryOp,
        operand: Box<AstNode>,
    },
    Binary {
        op: BinaryOp,
        left: Box<AstNode>,
        right: Box<AstNode>,
    },
}

pub fn number_literal(value: f64) -> AstNode {
    AstNode::Number(value)
}

pub fn unary_expr(op: UnaryOp, operand: AstNode) -> AstNode {
    AstNode::Unary {
        op,
        operand: Box::new(operand),
    }
}

pub fn binary_expr(op: BinaryOp, left: AstNode, right: AstNode) -> AstNode {
    AstNode::Binary {
        op,
        left: Box::new(left),
        right: Box::new(right),
    }
}

// ============================================================================
// TOKENIZER
// ============================================================================

fn is_digit(ch: char) -> bool {
    ch >= '0' && ch <= '9'
}

pub fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        match ch {
            ' ' | '\t' | '\n' | '\r' => {
                i += 1;
            }
            '(' => {
                tokens.push(token(TokenKind::LParen, "("));
                i += 1;
            }
            ')' => {
                tokens.push(token(TokenKind::RParen, ")"));
                i += 1;
            }
            '+' => {
                tokens.push(token(TokenKind::Plus, "+"));
                i += 1;
            }
            '-' => {
                tokens.push(token(TokenKind::Minus, "-"));
                i += 1;
            }
            '*' => {
                if i + 1 < chars.len() && chars[i + 1] == '*' {
                    tokens.push(token(TokenKind::Power, "**"));
                    i += 2;
                } else {
                    tokens.push(token(TokenKind::Star, "*"));
                    i += 1;
                }
            }
            '/' => {
                tokens.push(token(TokenKind::Slash, "/"));
                i += 1;
            }
            '%' => {
                tokens.push(token(TokenKind::Percent, "%"));
                i += 1;
            }
            '.' | '0'..='9' => {
                let mut num = String::new();
                let mut has_dot = false;
                while i < chars.len() {
                    let c = chars[i];
                    if c == '.' {
                        if has_dot {
                            return Err(format!("Unexpected character '.' at position {}", i));
                        }
                        has_dot = true;
                        num.push(c);
                        i += 1;
                    } else if is_digit(c) {
                        num.push(c);
                        i += 1;
                    } else {
                        break;
                    }
                }
                tokens.push(token(TokenKind::Number, &num));
            }
            _ => {
                return Err(format!("Unexpected character '{}' at position {}", ch, i));
            }
        }
    }

    Ok(tokens)
}

// ============================================================================
// PARSER
// ============================================================================

pub fn parse(tokens: Vec<Token>) -> Result<AstNode, String> {
    let mut parser = Parser { tokens, pos: 0 };
    let ast = parser.parse_add_sub()?;

    if parser.pos < parser.tokens.len() {
        let remaining = &parser.tokens[parser.pos];
        return Err(format!(
            "Unexpected token after expression: {} '{}'",
            remaining.kind, remaining.value
        ));
    }

    Ok(ast)
}

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }

    fn advance(&mut self) -> Option<Token> {
        if self.pos < self.tokens.len() {
            let token = self.tokens[self.pos].clone();
            self.pos += 1;
            Some(token)
        } else {
            None
        }
    }

    fn expect(&mut self, kind: TokenKind) -> Result<Token, String> {
        match self.peek() {
            Some(t) if t.kind == kind => {
                Ok(self.advance().unwrap())
            }
            Some(t) => {
                Err(format!("Expected {} but got {}", kind, t.kind))
            }
            None => {
                Err(format!("Expected {} but got end of input", kind))
            }
        }
    }

    fn parse_add_sub(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_mul_div()?;
        loop {
            match self.peek().map(|t| t.kind) {
                Some(TokenKind::Plus) => {
                    self.advance();
                    let right = self.parse_mul_div()?;
                    left = binary_expr(BinaryOp::Add, left, right);
                }
                Some(TokenKind::Minus) => {
                    self.advance();
                    let right = self.parse_mul_div()?;
                    left = binary_expr(BinaryOp::Sub, left, right);
                }
                _ => break,
            }
        }
        Ok(left)
    }

    fn parse_mul_div(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_power()?;
        loop {
            match self.peek().map(|t| t.kind) {
                Some(TokenKind::Star) => {
                    self.advance();
                    let right = self.parse_power()?;
                    left = binary_expr(BinaryOp::Mul, left, right);
                }
                Some(TokenKind::Slash) => {
                    self.advance();
                    let right = self.parse_power()?;
                    left = binary_expr(BinaryOp::Div, left, right);
                }
                Some(TokenKind::Percent) => {
                    self.advance();
                    let right = self.parse_power()?;
                    left = binary_expr(BinaryOp::Mod, left, right);
                }
                _ => break,
            }
        }
        Ok(left)
    }

    fn parse_power(&mut self) -> Result<AstNode, String> {
        let base = self.parse_unary()?;
        if self.peek().map(|t| t.kind) == Some(TokenKind::Power) {
            self.advance();
            let exponent = self.parse_power()?; // right-recursive for right-associativity
            Ok(binary_expr(BinaryOp::Pow, base, exponent))
        } else {
            Ok(base)
        }
    }

    fn parse_unary(&mut self) -> Result<AstNode, String> {
        if self.peek().map(|t| t.kind) == Some(TokenKind::Minus) {
            self.advance();
            let operand = self.parse_unary()?; // allow chained unary
            Ok(unary_expr(UnaryOp::Neg, operand))
        } else {
            self.parse_atom()
        }
    }

    fn parse_atom(&mut self) -> Result<AstNode, String> {
        match self.peek() {
            None => Err("Unexpected end of input".to_string()),
            Some(t) if t.kind == TokenKind::Number => {
                let token = self.advance().unwrap();
                let value: f64 = token.value.parse()
                    .map_err(|_| format!("Invalid number: {}", token.value))?;
                Ok(number_literal(value))
            }
            Some(t) if t.kind == TokenKind::LParen => {
                self.advance();
                let expr = self.parse_add_sub()?;
                self.expect(TokenKind::RParen)?;
                Ok(expr)
            }
            Some(t) => {
                Err(format!("Unexpected token: {} '{}'", t.kind, t.value))
            }
        }
    }
}

// ============================================================================
// EVALUATOR
// ============================================================================

pub fn evaluate(node: &AstNode) -> Result<f64, String> {
    match node {
        AstNode::Number(value) => Ok(*value),
        AstNode::Unary { op: _, operand } => {
            let val = evaluate(operand)?;
            Ok(-val)
        }
        AstNode::Binary { op, left, right } => {
            let left_val = evaluate(left)?;
            let right_val = evaluate(right)?;
            match op {
                BinaryOp::Add => Ok(left_val + right_val),
                BinaryOp::Sub => Ok(left_val - right_val),
                BinaryOp::Mul => Ok(left_val * right_val),
                BinaryOp::Div => {
                    if right_val == 0.0 {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(left_val / right_val)
                    }
                }
                BinaryOp::Mod => {
                    if right_val == 0.0 {
                        Err("Modulo by zero".to_string())
                    } else {
                        Ok(left_val % right_val)
                    }
                }
                BinaryOp::Pow => Ok(left_val.powf(right_val)),
            }
        }
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

pub fn calc(expression: &str) -> Result<f64, String> {
    let trimmed = expression.trim();
    if trimmed.is_empty() {
        return Err("Empty expression".to_string());
    }

    let tokens = tokenize(trimmed)?;
    let ast = parse(tokens)?;
    evaluate(&ast)
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ===== TOKEN-TYPES TESTS =====
    mod token_types_tests {
        use super::*;

        #[test]
        fn token_creates_a_token_with_kind_and_value() {
            let t = token(TokenKind::Number, "42");
            assert_eq!(t.kind, TokenKind::Number);
            assert_eq!(t.value, "42");
        }

        #[test]
        fn token_creates_operator_tokens() {
            assert_eq!(
                token(TokenKind::Plus, "+"),
                Token {
                    kind: TokenKind::Plus,
                    value: "+".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::Minus, "-"),
                Token {
                    kind: TokenKind::Minus,
                    value: "-".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::Star, "*"),
                Token {
                    kind: TokenKind::Star,
                    value: "*".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::Slash, "/"),
                Token {
                    kind: TokenKind::Slash,
                    value: "/".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::Percent, "%"),
                Token {
                    kind: TokenKind::Percent,
                    value: "%".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::Power, "**"),
                Token {
                    kind: TokenKind::Power,
                    value: "**".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::LParen, "("),
                Token {
                    kind: TokenKind::LParen,
                    value: "(".to_string()
                }
            );
            assert_eq!(
                token(TokenKind::RParen, ")"),
                Token {
                    kind: TokenKind::RParen,
                    value: ")".to_string()
                }
            );
        }
    }

    // ===== AST-TYPES TESTS =====
    mod ast_types_tests {
        use super::*;

        #[test]
        fn test_number_literal_creates_a_number_node() {
            let n = number_literal(42.0);
            assert_eq!(n, AstNode::Number(42.0));
        }

        #[test]
        fn test_unary_expr_creates_a_unary_node() {
            let operand = number_literal(5.0);
            let u = unary_expr(UnaryOp::Neg, operand);
            assert_eq!(
                u,
                AstNode::Unary {
                    op: UnaryOp::Neg,
                    operand: Box::new(AstNode::Number(5.0))
                }
            );
        }

        #[test]
        fn test_binary_expr_creates_a_binary_node() {
            let left = number_literal(2.0);
            let right = number_literal(3.0);
            let b = binary_expr(BinaryOp::Add, left, right);
            assert_eq!(
                b,
                AstNode::Binary {
                    op: BinaryOp::Add,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Number(3.0))
                }
            );
        }

        #[test]
        fn test_nested_expressions() {
            // (2 + 3) * -4
            let inner = binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0));
            let neg = unary_expr(UnaryOp::Neg, number_literal(4.0));
            let expr = binary_expr(BinaryOp::Mul, inner, neg);
            
            if let AstNode::Binary { op, left, right } = expr {
                assert_eq!(op, BinaryOp::Mul);
                assert_eq!(
                    *left,
                    AstNode::Binary {
                        op: BinaryOp::Add,
                        left: Box::new(AstNode::Number(2.0)),
                        right: Box::new(AstNode::Number(3.0))
                    }
                );
                assert_eq!(
                    *right,
                    AstNode::Unary {
                        op: UnaryOp::Neg,
                        operand: Box::new(AstNode::Number(4.0))
                    }
                );
            } else {
                panic!("Expected binary expression");
            }
        }
    }

    // ===== TOKENIZER TESTS =====
    mod tokenizer_tests {
        use super::*;

        #[test]
        fn test_empty_string() {
            assert_eq!(tokenize("").unwrap(), vec![]);
        }

        #[test]
        fn test_whitespace_only() {
            assert_eq!(tokenize("   \t\n\r  ").unwrap(), vec![]);
        }

        #[test]
        fn test_single_integer() {
            assert_eq!(
                tokenize("42").unwrap(),
                vec![token(TokenKind::Number, "42")]
            );
        }

        #[test]
        fn test_decimal_number() {
            assert_eq!(
                tokenize("3.14").unwrap(),
                vec![token(TokenKind::Number, "3.14")]
            );
        }

        #[test]
        fn test_number_starting_with_dot() {
            assert_eq!(
                tokenize(".5").unwrap(),
                vec![token(TokenKind::Number, ".5")]
            );
        }

        #[test]
        fn test_all_operators() {
            let tokens = tokenize("+ - * / % **").unwrap();
            assert_eq!(
                tokens,
                vec![
                    token(TokenKind::Plus, "+"),
                    token(TokenKind::Minus, "-"),
                    token(TokenKind::Star, "*"),
                    token(TokenKind::Slash, "/"),
                    token(TokenKind::Percent, "%"),
                    token(TokenKind::Power, "**"),
                ]
            );
        }

        #[test]
        fn test_parentheses() {
            let tokens = tokenize("(1)").unwrap();
            assert_eq!(
                tokens,
                vec![
                    token(TokenKind::LParen, "("),
                    token(TokenKind::Number, "1"),
                    token(TokenKind::RParen, ")"),
                ]
            );
        }

        #[test]
        fn test_complex_expression() {
            let tokens = tokenize("2 + 3 * (4 - 1)").unwrap();
            assert_eq!(
                tokens,
                vec![
                    token(TokenKind::Number, "2"),
                    token(TokenKind::Plus, "+"),
                    token(TokenKind::Number, "3"),
                    token(TokenKind::Star, "*"),
                    token(TokenKind::LParen, "("),
                    token(TokenKind::Number, "4"),
                    token(TokenKind::Minus, "-"),
                    token(TokenKind::Number, "1"),
                    token(TokenKind::RParen, ")"),
                ]
            );
        }

        #[test]
        fn test_power_operator_distinguished_from_multiply() {
            let tokens = tokenize("2**3*4").unwrap();
            assert_eq!(
                tokens,
                vec![
                    token(TokenKind::Number, "2"),
                    token(TokenKind::Power, "**"),
                    token(TokenKind::Number, "3"),
                    token(TokenKind::Star, "*"),
                    token(TokenKind::Number, "4"),
                ]
            );
        }

        #[test]
        fn test_no_whitespace() {
            let tokens = tokenize("1+2").unwrap();
            assert_eq!(
                tokens,
                vec![
                    token(TokenKind::Number, "1"),
                    token(TokenKind::Plus, "+"),
                    token(TokenKind::Number, "2"),
                ]
            );
        }

        #[test]
        fn test_multiple_decimals_in_one_number_throws() {
            let err = tokenize("1.2.3").unwrap_err();
            assert!(err.contains("Unexpected character '.'"));
        }

        #[test]
        fn test_unrecognized_character_throws() {
            let err = tokenize("2 @ 3").unwrap_err();
            assert!(err.contains("Unexpected character '@'"));
        }

        #[test]
        fn test_unrecognized_character_reports_position() {
            let err = tokenize("2 @ 3").unwrap_err();
            assert!(err.contains("position 2"));
        }
    }

    // ===== PARSER TESTS =====
    mod parser_tests {
        use super::*;

        fn p(input: &str) -> AstNode {
            let tokens = tokenize(input).expect("tokenize failed");
            parse(tokens).expect("parse failed")
        }

        // Atoms
        #[test]
        fn test_single_number() {
            assert_eq!(p("42"), AstNode::Number(42.0));
        }

        #[test]
        fn test_decimal_number() {
            assert_eq!(p("3.14"), AstNode::Number(3.14));
        }

        #[test]
        fn test_parenthesized_number() {
            assert_eq!(p("(42)"), AstNode::Number(42.0));
        }

        #[test]
        fn test_nested_parentheses() {
            assert_eq!(p("((7))"), AstNode::Number(7.0));
        }

        // Binary operations
        #[test]
        fn test_addition() {
            assert_eq!(
                p("2 + 3"),
                AstNode::Binary {
                    op: BinaryOp::Add,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }
            );
        }

        #[test]
        fn test_subtraction() {
            assert_eq!(
                p("5 - 1"),
                AstNode::Binary {
                    op: BinaryOp::Sub,
                    left: Box::new(AstNode::Number(5.0)),
                    right: Box::new(AstNode::Number(1.0)),
                }
            );
        }

        #[test]
        fn test_multiplication() {
            assert_eq!(
                p("4 * 6"),
                AstNode::Binary {
                    op: BinaryOp::Mul,
                    left: Box::new(AstNode::Number(4.0)),
                    right: Box::new(AstNode::Number(6.0)),
                }
            );
        }

        #[test]
        fn test_division() {
            assert_eq!(
                p("10 / 2"),
                AstNode::Binary {
                    op: BinaryOp::Div,
                    left: Box::new(AstNode::Number(10.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }
            );
        }

        #[test]
        fn test_modulo() {
            assert_eq!(
                p("10 % 3"),
                AstNode::Binary {
                    op: BinaryOp::Mod,
                    left: Box::new(AstNode::Number(10.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }
            );
        }

        #[test]
        fn test_power() {
            assert_eq!(
                p("2 ** 3"),
                AstNode::Binary {
                    op: BinaryOp::Pow,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }
            );
        }

        // Precedence
        #[test]
        fn test_multiply_before_add() {
            // 2 + 3 * 4 → 2 + (3 * 4)
            let ast = p("2 + 3 * 4");
            assert_eq!(
                ast,
                AstNode::Binary {
                    op: BinaryOp::Add,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Binary {
                        op: BinaryOp::Mul,
                        left: Box::new(AstNode::Number(3.0)),
                        right: Box::new(AstNode::Number(4.0)),
                    }),
                }
            );
        }

        #[test]
        fn test_power_before_multiply() {
            // 2 * 3 ** 2 → 2 * (3 ** 2)
            let ast = p("2 * 3 ** 2");
            assert_eq!(
                ast,
                AstNode::Binary {
                    op: BinaryOp::Mul,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Binary {
                        op: BinaryOp::Pow,
                        left: Box::new(AstNode::Number(3.0)),
                        right: Box::new(AstNode::Number(2.0)),
                    }),
                }
            );
        }

        #[test]
        fn test_parens_override_precedence() {
            // (2 + 3) * 4
            let ast = p("(2 + 3) * 4");
            assert_eq!(
                ast,
                AstNode::Binary {
                    op: BinaryOp::Mul,
                    left: Box::new(AstNode::Binary {
                        op: BinaryOp::Add,
                        left: Box::new(AstNode::Number(2.0)),
                        right: Box::new(AstNode::Number(3.0)),
                    }),
                    right: Box::new(AstNode::Number(4.0)),
                }
            );
        }

        // Associativity
        #[test]
        fn test_left_associative_sub() {
            // 1 - 2 - 3 → (1 - 2) - 3
            let ast = p("1 - 2 - 3");
            assert_eq!(
                ast,
                AstNode::Binary {
                    op: BinaryOp::Sub,
                    left: Box::new(AstNode::Binary {
                        op: BinaryOp::Sub,
                        left: Box::new(AstNode::Number(1.0)),
                        right: Box::new(AstNode::Number(2.0)),
                    }),
                    right: Box::new(AstNode::Number(3.0)),
                }
            );
        }

        #[test]
        fn test_left_associative_div() {
            // 12 / 3 / 2 → (12 / 3) / 2
            let ast = p("12 / 3 / 2");
            assert_eq!(
                ast,
                AstNode::Binary {
                    op: BinaryOp::Div,
                    left: Box::new(AstNode::Binary {
                        op: BinaryOp::Div,
                        left: Box::new(AstNode::Number(12.0)),
                        right: Box::new(AstNode::Number(3.0)),
                    }),
                    right: Box::new(AstNode::Number(2.0)),
                }
            );
        }

        #[test]
        fn test_right_associative_pow() {
            // 2 ** 3 ** 2 → 2 ** (3 ** 2)
            let ast = p("2 ** 3 ** 2");
            assert_eq!(
                ast,
                AstNode::Binary {
                    op: BinaryOp::Pow,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Binary {
                        op: BinaryOp::Pow,
                        left: Box::new(AstNode::Number(3.0)),
                        right: Box::new(AstNode::Number(2.0)),
                    }),
                }
            );
        }

        // Unary
        #[test]
        fn test_unary_minus() {
            assert_eq!(
                p("-5"),
                AstNode::Unary {
                    op: UnaryOp::Neg,
                    operand: Box::new(AstNode::Number(5.0)),
                }
            );
        }

        #[test]
        fn test_double_unary_minus() {
            assert_eq!(
                p("--5"),
                AstNode::Unary {
                    op: UnaryOp::Neg,
                    operand: Box::new(AstNode::Unary {
                        op: UnaryOp::Neg,
                        operand: Box::new(AstNode::Number(5.0)),
                    }),
                }
            );
        }

        #[test]
        fn test_unary_in_expression() {
            // 2 * -3
            assert_eq!(
                p("2 * -3"),
                AstNode::Binary {
                    op: BinaryOp::Mul,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Unary {
                        op: UnaryOp::Neg,
                        operand: Box::new(AstNode::Number(3.0)),
                    }),
                }
            );
        }

        // Errors
        #[test]
        fn test_empty_token_list() {
            let result = parse(vec![]);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Unexpected end of input"));
        }

        #[test]
        fn test_unmatched_left_paren() {
            let result = calc("(2 + 3");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Expected rparen"));
        }

        #[test]
        fn test_unmatched_right_paren() {
            let result = calc("2 + 3)");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Unexpected token after expression"));
        }

        #[test]
        fn test_unexpected_operator_at_start() {
            let result = calc("* 5");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Unexpected token: star"));
        }

        #[test]
        fn test_trailing_operator() {
            let result = calc("2 +");
            assert!(result.is_err());
        }
    }

    // ===== EVALUATOR TESTS =====
    mod evaluator_tests {
        use super::*;

        #[test]
        fn test_eval_number_literal() {
            assert_eq!(evaluate(&number_literal(42.0)).unwrap(), 42.0);
        }

        #[test]
        fn test_eval_unary_negation() {
            assert_eq!(
                evaluate(&unary_expr(UnaryOp::Neg, number_literal(5.0))).unwrap(),
                -5.0
            );
        }

        #[test]
        fn test_eval_addition() {
            assert_eq!(
                evaluate(&binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0)))
                    .unwrap(),
                5.0
            );
        }

        #[test]
        fn test_eval_subtraction() {
            assert_eq!(
                evaluate(&binary_expr(BinaryOp::Sub, number_literal(10.0), number_literal(4.0)))
                    .unwrap(),
                6.0
            );
        }

        #[test]
        fn test_eval_multiplication() {
            assert_eq!(
                evaluate(&binary_expr(BinaryOp::Mul, number_literal(3.0), number_literal(7.0)))
                    .unwrap(),
                21.0
            );
        }

        #[test]
        fn test_eval_division() {
            assert_eq!(
                evaluate(&binary_expr(BinaryOp::Div, number_literal(10.0), number_literal(4.0)))
                    .unwrap(),
                2.5
            );
        }

        #[test]
        fn test_eval_modulo() {
            assert_eq!(
                evaluate(&binary_expr(BinaryOp::Mod, number_literal(10.0), number_literal(3.0)))
                    .unwrap(),
                1.0
            );
        }

        #[test]
        fn test_eval_power() {
            assert_eq!(
                evaluate(&binary_expr(BinaryOp::Pow, number_literal(2.0), number_literal(10.0)))
                    .unwrap(),
                1024.0
            );
        }

        #[test]
        fn test_eval_division_by_zero_throws() {
            let result = evaluate(&binary_expr(BinaryOp::Div, number_literal(1.0), number_literal(0.0)));
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Division by zero"));
        }

        #[test]
        fn test_eval_modulo_by_zero_throws() {
            let result = evaluate(&binary_expr(BinaryOp::Mod, number_literal(1.0), number_literal(0.0)));
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Modulo by zero"));
        }

        #[test]
        fn test_eval_nested_expression() {
            // (2 + 3) * -4
            let expr = binary_expr(
                BinaryOp::Mul,
                binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0)),
                unary_expr(UnaryOp::Neg, number_literal(4.0)),
            );
            assert_eq!(evaluate(&expr).unwrap(), -20.0);
        }
    }

    // ===== CALC (END-TO-END) TESTS =====
    mod calc_integration_tests {
        use super::*;

        // Basic arithmetic
        #[test]
        fn test_1_plus_2() {
            assert_eq!(calc("1 + 2").unwrap(), 3.0);
        }

        #[test]
        fn test_10_minus_3() {
            assert_eq!(calc("10 - 3").unwrap(), 7.0);
        }

        #[test]
        fn test_4_mul_5() {
            assert_eq!(calc("4 * 5").unwrap(), 20.0);
        }

        #[test]
        fn test_15_div_4() {
            assert_eq!(calc("15 / 4").unwrap(), 3.75);
        }

        #[test]
        fn test_10_mod_3() {
            assert_eq!(calc("10 % 3").unwrap(), 1.0);
        }

        #[test]
        fn test_2_pow_8() {
            assert_eq!(calc("2 ** 8").unwrap(), 256.0);
        }

        // Precedence
        #[test]
        fn test_2_plus_3_mul_4() {
            assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
        }

        #[test]
        fn test_2_mul_3_plus_4() {
            assert_eq!(calc("2 * 3 + 4").unwrap(), 10.0);
        }

        #[test]
        fn test_10_minus_2_mul_3() {
            assert_eq!(calc("10 - 2 * 3").unwrap(), 4.0);
        }

        #[test]
        fn test_2_plus_3_pow_2() {
            assert_eq!(calc("2 + 3 ** 2").unwrap(), 11.0);
        }

        #[test]
        fn test_2_mul_3_pow_2() {
            assert_eq!(calc("2 * 3 ** 2").unwrap(), 18.0);
        }

        #[test]
        fn test_2_pow_3_mul_4() {
            assert_eq!(calc("2 ** 3 * 4").unwrap(), 32.0);
        }

        // Parentheses
        #[test]
        fn test_paren_2_plus_3_mul_4() {
            assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
        }

        #[test]
        fn test_2_mul_paren_3_plus_4() {
            assert_eq!(calc("2 * (3 + 4)").unwrap(), 14.0);
        }

        #[test]
        fn test_paren_2_plus_3_mul_paren_4_plus_5() {
            assert_eq!(calc("(2 + 3) * (4 + 5)").unwrap(), 45.0);
        }

        #[test]
        fn test_nested_parens() {
            assert_eq!(calc("((1 + 2) * (3 + 4))").unwrap(), 21.0);
        }

        #[test]
        fn test_paren_10() {
            assert_eq!(calc("(10)").unwrap(), 10.0);
        }

        // Associativity
        #[test]
        fn test_1_minus_2_minus_3() {
            assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
        }

        #[test]
        fn test_1_minus_2_plus_3() {
            assert_eq!(calc("1 - 2 + 3").unwrap(), 2.0);
        }

        #[test]
        fn test_12_div_3_div_2() {
            assert_eq!(calc("12 / 3 / 2").unwrap(), 2.0);
        }

        #[test]
        fn test_2_pow_3_pow_2() {
            assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
        }

        // Unary minus
        #[test]
        fn test_neg_5() {
            assert_eq!(calc("-5").unwrap(), -5.0);
        }

        #[test]
        fn test_neg_neg_5() {
            assert_eq!(calc("--5").unwrap(), 5.0);
        }

        #[test]
        fn test_neg_paren_neg_5() {
            assert_eq!(calc("-(-5)").unwrap(), 5.0);
        }

        #[test]
        fn test_2_mul_neg_3() {
            assert_eq!(calc("2 * -3").unwrap(), -6.0);
        }

        #[test]
        fn test_neg_2_pow_2() {
            assert_eq!(calc("-2 ** 2").unwrap(), 4.0);
        }

        #[test]
        fn test_neg_paren_2_pow_2() {
            assert_eq!(calc("-(2 ** 2)").unwrap(), -4.0);
        }

        // Decimals
        #[test]
        fn test_0_1_plus_0_2() {
            let result = calc("0.1 + 0.2").unwrap();
            assert!((result - (0.1 + 0.2)).abs() < 1e-10);
        }

        #[test]
        fn test_3_14_mul_2() {
            assert_eq!(calc("3.14 * 2").unwrap(), 6.28);
        }

        #[test]
        fn test_dot_5_plus_dot_5() {
            assert_eq!(calc(".5 + .5").unwrap(), 1.0);
        }

        // Complex expressions
        #[test]
        fn test_2_plus_3_mul_4_minus_1() {
            assert_eq!(calc("2 + 3 * 4 - 1").unwrap(), 13.0);
        }

        #[test]
        fn test_complex_1() {
            assert_eq!(calc("(2 + 3) * (4 - 1) / 5").unwrap(), 3.0);
        }

        #[test]
        fn test_complex_2() {
            assert_eq!(calc("10 % 3 + 2 ** 3").unwrap(), 9.0);
        }

        #[test]
        fn test_complex_3() {
            assert_eq!(calc("2 ** (1 + 2)").unwrap(), 8.0);
        }

        #[test]
        fn test_complex_4() {
            assert_eq!(calc("100 / 10 / 2 + 3").unwrap(), 8.0);
        }

        // Errors
        #[test]
        fn test_empty_expression() {
            let result = calc("");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Empty expression"));
        }

        #[test]
        fn test_whitespace_only() {
            let result = calc("   ");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Empty expression"));
        }

        #[test]
        fn test_div_by_zero() {
            let result = calc("1 / 0");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Division by zero"));
        }

        #[test]
        fn test_mod_by_zero() {
            let result = calc("5 % 0");
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Modulo by zero"));
        }

        #[test]
        fn test_unmatched_paren() {
            let result = calc("(2 + 3");
            assert!(result.is_err());
        }

        #[test]
        fn test_invalid_character() {
            let result = calc("2 @ 3");
            assert!(result.is_err());
        }

        #[test]
        fn test_trailing_operator_error() {
            let result = calc("2 +");
            assert!(result.is_err());
        }
    }
}
