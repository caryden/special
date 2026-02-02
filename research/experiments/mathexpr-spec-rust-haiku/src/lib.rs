use std::fmt;

// Token types
#[derive(Debug, Clone, PartialEq)]
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

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub kind: TokenKind,
    pub value: String,
}

impl Token {
    fn new(kind: TokenKind, value: String) -> Self {
        Token { kind, value }
    }
}

// AST node types
#[derive(Debug, Clone, PartialEq)]
pub enum AstNode {
    Number(f64),
    Unary {
        op: String,
        operand: Box<AstNode>,
    },
    Binary {
        op: String,
        left: Box<AstNode>,
        right: Box<AstNode>,
    },
}

// Error type
#[derive(Debug, Clone, PartialEq)]
pub enum Error {
    TokenizerError(String),
    ParserError(String),
    EvaluatorError(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Error::TokenizerError(msg) => write!(f, "Tokenizer error: {}", msg),
            Error::ParserError(msg) => write!(f, "Parser error: {}", msg),
            Error::EvaluatorError(msg) => write!(f, "Evaluator error: {}", msg),
        }
    }
}

// Tokenizer
pub fn tokenize(input: &str) -> Result<Vec<Token>, Error> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        match chars[i] {
            // Skip whitespace
            ' ' | '\t' | '\n' | '\r' => {
                i += 1;
            }
            // Plus
            '+' => {
                tokens.push(Token::new(TokenKind::Plus, "+".to_string()));
                i += 1;
            }
            // Minus
            '-' => {
                tokens.push(Token::new(TokenKind::Minus, "-".to_string()));
                i += 1;
            }
            // Star or Power
            '*' => {
                if i + 1 < chars.len() && chars[i + 1] == '*' {
                    tokens.push(Token::new(TokenKind::Power, "**".to_string()));
                    i += 2;
                } else {
                    tokens.push(Token::new(TokenKind::Star, "*".to_string()));
                    i += 1;
                }
            }
            // Slash
            '/' => {
                tokens.push(Token::new(TokenKind::Slash, "/".to_string()));
                i += 1;
            }
            // Percent
            '%' => {
                tokens.push(Token::new(TokenKind::Percent, "%".to_string()));
                i += 1;
            }
            // LParen
            '(' => {
                tokens.push(Token::new(TokenKind::LParen, "(".to_string()));
                i += 1;
            }
            // RParen
            ')' => {
                tokens.push(Token::new(TokenKind::RParen, ")".to_string()));
                i += 1;
            }
            // Number (including .5 format)
            c if c.is_ascii_digit() || (c == '.' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit()) => {
                let start = i;
                let mut has_dot = false;

                while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                    if chars[i] == '.' {
                        if has_dot {
                            return Err(Error::TokenizerError(format!(
                                "Unexpected character `.`"
                            )));
                        }
                        has_dot = true;
                    }
                    i += 1;
                }

                let number_str: String = chars[start..i].iter().collect();
                tokens.push(Token::new(TokenKind::Number, number_str));
            }
            // Handle leading dot (e.g., .5)
            '.' if i + 1 < chars.len() && chars[i + 1].is_ascii_digit() => {
                let start = i;
                i += 1; // consume the dot
                while i < chars.len() && chars[i].is_ascii_digit() {
                    i += 1;
                }
                let number_str: String = chars[start..i].iter().collect();
                tokens.push(Token::new(TokenKind::Number, number_str));
            }
            // Unrecognized character
            c => {
                return Err(Error::TokenizerError(format!(
                    "Unexpected character `{}` at position {}",
                    c, i
                )));
            }
        }
    }

    Ok(tokens)
}

// Parser
pub struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Parser { tokens, pos: 0 }
    }

    fn current(&self) -> Option<&Token> {
        if self.pos < self.tokens.len() {
            Some(&self.tokens[self.pos])
        } else {
            None
        }
    }

    fn advance(&mut self) {
        self.pos += 1;
    }

    fn expect(&mut self, kind: TokenKind) -> Result<(), Error> {
        if let Some(token) = self.current() {
            if token.kind == kind {
                self.advance();
                Ok(())
            } else {
                Err(Error::ParserError("Expected rparen".to_string()))
            }
        } else {
            Err(Error::ParserError("Expected rparen".to_string()))
        }
    }

    fn parse_expr(&mut self) -> Result<AstNode, Error> {
        self.parse_addition()
    }

    fn parse_addition(&mut self) -> Result<AstNode, Error> {
        let mut left = self.parse_multiplication()?;

        while let Some(token) = self.current() {
            if token.kind == TokenKind::Plus {
                self.advance();
                let right = self.parse_multiplication()?;
                left = AstNode::Binary {
                    op: "+".to_string(),
                    left: Box::new(left),
                    right: Box::new(right),
                };
            } else if token.kind == TokenKind::Minus {
                self.advance();
                let right = self.parse_multiplication()?;
                left = AstNode::Binary {
                    op: "-".to_string(),
                    left: Box::new(left),
                    right: Box::new(right),
                };
            } else {
                break;
            }
        }

        Ok(left)
    }

    fn parse_multiplication(&mut self) -> Result<AstNode, Error> {
        let mut left = self.parse_power()?;

        while let Some(token) = self.current() {
            if token.kind == TokenKind::Star {
                self.advance();
                let right = self.parse_power()?;
                left = AstNode::Binary {
                    op: "*".to_string(),
                    left: Box::new(left),
                    right: Box::new(right),
                };
            } else if token.kind == TokenKind::Slash {
                self.advance();
                let right = self.parse_power()?;
                left = AstNode::Binary {
                    op: "/".to_string(),
                    left: Box::new(left),
                    right: Box::new(right),
                };
            } else if token.kind == TokenKind::Percent {
                self.advance();
                let right = self.parse_power()?;
                left = AstNode::Binary {
                    op: "%".to_string(),
                    left: Box::new(left),
                    right: Box::new(right),
                };
            } else {
                break;
            }
        }

        Ok(left)
    }

    fn parse_power(&mut self) -> Result<AstNode, Error> {
        let left = self.parse_unary()?;

        if let Some(token) = self.current() {
            if token.kind == TokenKind::Power {
                self.advance();
                let right = self.parse_power()?; // Right associative
                return Ok(AstNode::Binary {
                    op: "**".to_string(),
                    left: Box::new(left),
                    right: Box::new(right),
                });
            }
        }

        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<AstNode, Error> {
        if let Some(token) = self.current() {
            if token.kind == TokenKind::Minus {
                self.advance();
                let operand = self.parse_unary()?; // Right associative
                return Ok(AstNode::Unary {
                    op: "-".to_string(),
                    operand: Box::new(operand),
                });
            }
        }

        self.parse_atom()
    }

    fn parse_atom(&mut self) -> Result<AstNode, Error> {
        if let Some(token) = self.current() {
            match token.kind {
                TokenKind::Number => {
                    let value_str = token.value.clone();
                    self.advance();
                    let value: f64 = value_str.parse().map_err(|_| {
                        Error::ParserError("Invalid number".to_string())
                    })?;
                    Ok(AstNode::Number(value))
                }
                TokenKind::LParen => {
                    self.advance();
                    let expr = self.parse_expr()?;
                    self.expect(TokenKind::RParen)?;
                    Ok(expr)
                }
                _ => Err(Error::ParserError(format!(
                    "Unexpected token: {:?}",
                    token.kind
                ))),
            }
        } else {
            Err(Error::ParserError("Unexpected end of input".to_string()))
        }
    }
}

pub fn parse(tokens: Vec<Token>) -> Result<AstNode, Error> {
    if tokens.is_empty() {
        return Err(Error::ParserError("Unexpected end of input".to_string()));
    }

    let mut parser = Parser::new(tokens);
    let expr = parser.parse_expr()?;

    if parser.pos < parser.tokens.len() {
        return Err(Error::ParserError("Unexpected token after expression".to_string()));
    }

    Ok(expr)
}

// Evaluator
pub fn evaluate(node: &AstNode) -> Result<f64, Error> {
    match node {
        AstNode::Number(value) => Ok(*value),
        AstNode::Unary { op, operand } => {
            let operand_val = evaluate(operand)?;
            if op == "-" {
                Ok(-operand_val)
            } else {
                Err(Error::EvaluatorError(format!("Unknown unary operator: {}", op)))
            }
        }
        AstNode::Binary { op, left, right } => {
            let left_val = evaluate(left)?;
            let right_val = evaluate(right)?;
            match op.as_str() {
                "+" => Ok(left_val + right_val),
                "-" => Ok(left_val - right_val),
                "*" => Ok(left_val * right_val),
                "/" => {
                    if right_val == 0.0 {
                        Err(Error::EvaluatorError("Division by zero".to_string()))
                    } else {
                        Ok(left_val / right_val)
                    }
                }
                "%" => {
                    if right_val == 0.0 {
                        Err(Error::EvaluatorError("Modulo by zero".to_string()))
                    } else {
                        Ok(left_val % right_val)
                    }
                }
                "**" => Ok(left_val.powf(right_val)),
                _ => Err(Error::EvaluatorError(format!("Unknown operator: {}", op))),
            }
        }
    }
}

// Main public API
pub fn calc(expression: &str) -> Result<f64, Error> {
    // Check for empty or whitespace-only input
    if expression.trim().is_empty() {
        return Err(Error::EvaluatorError("Empty expression".to_string()));
    }

    let tokens = tokenize(expression)?;
    
    if tokens.is_empty() {
        return Err(Error::EvaluatorError("Empty expression".to_string()));
    }
    
    let ast = parse(tokens)?;
    evaluate(&ast)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Tokenizer tests
    #[test]
    fn test_tokenize_empty() {
        let tokens = tokenize("").unwrap();
        assert_eq!(tokens, vec![]);
    }

    #[test]
    fn test_tokenize_whitespace() {
        let tokens = tokenize("   \t\n  ").unwrap();
        assert_eq!(tokens, vec![]);
    }

    #[test]
    fn test_tokenize_number() {
        let tokens = tokenize("42").unwrap();
        assert_eq!(tokens, vec![Token::new(TokenKind::Number, "42".to_string())]);
    }

    #[test]
    fn test_tokenize_decimal() {
        let tokens = tokenize("3.14").unwrap();
        assert_eq!(tokens, vec![Token::new(TokenKind::Number, "3.14".to_string())]);
    }

    #[test]
    fn test_tokenize_leading_dot() {
        let tokens = tokenize(".5").unwrap();
        assert_eq!(tokens, vec![Token::new(TokenKind::Number, ".5".to_string())]);
    }

    #[test]
    fn test_tokenize_operators() {
        let tokens = tokenize("+ - * / % **").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Plus, "+".to_string()),
                Token::new(TokenKind::Minus, "-".to_string()),
                Token::new(TokenKind::Star, "*".to_string()),
                Token::new(TokenKind::Slash, "/".to_string()),
                Token::new(TokenKind::Percent, "%".to_string()),
                Token::new(TokenKind::Power, "**".to_string()),
            ]
        );
    }

    #[test]
    fn test_tokenize_parens() {
        let tokens = tokenize("(1)").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::LParen, "(".to_string()),
                Token::new(TokenKind::Number, "1".to_string()),
                Token::new(TokenKind::RParen, ")".to_string()),
            ]
        );
    }

    #[test]
    fn test_tokenize_complex() {
        let tokens = tokenize("2 + 3 * (4 - 1)").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Number, "2".to_string()),
                Token::new(TokenKind::Plus, "+".to_string()),
                Token::new(TokenKind::Number, "3".to_string()),
                Token::new(TokenKind::Star, "*".to_string()),
                Token::new(TokenKind::LParen, "(".to_string()),
                Token::new(TokenKind::Number, "4".to_string()),
                Token::new(TokenKind::Minus, "-".to_string()),
                Token::new(TokenKind::Number, "1".to_string()),
                Token::new(TokenKind::RParen, ")".to_string()),
            ]
        );
    }

    #[test]
    fn test_tokenize_power() {
        let tokens = tokenize("2**3*4").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Number, "2".to_string()),
                Token::new(TokenKind::Power, "**".to_string()),
                Token::new(TokenKind::Number, "3".to_string()),
                Token::new(TokenKind::Star, "*".to_string()),
                Token::new(TokenKind::Number, "4".to_string()),
            ]
        );
    }

    #[test]
    fn test_tokenize_no_spaces() {
        let tokens = tokenize("1+2").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Number, "1".to_string()),
                Token::new(TokenKind::Plus, "+".to_string()),
                Token::new(TokenKind::Number, "2".to_string()),
            ]
        );
    }

    #[test]
    fn test_tokenize_double_dot_error() {
        let result = tokenize("1.2.3");
        assert!(result.is_err());
        if let Err(Error::TokenizerError(msg)) = result {
            assert!(msg.contains("Unexpected character `.`"));
        } else {
            panic!("Expected TokenizerError");
        }
    }

    #[test]
    fn test_tokenize_invalid_char() {
        let result = tokenize("2 @ 3");
        assert!(result.is_err());
        if let Err(Error::TokenizerError(msg)) = result {
            assert!(msg.contains("Unexpected character `@`"));
            assert!(msg.contains("position 2"));
        } else {
            panic!("Expected TokenizerError");
        }
    }

    // Parser tests
    #[test]
    fn test_parse_number() {
        let tokens = vec![Token::new(TokenKind::Number, "42".to_string())];
        let ast = parse(tokens).unwrap();
        assert_eq!(ast, AstNode::Number(42.0));
    }

    #[test]
    fn test_parse_decimal() {
        let tokens = vec![Token::new(TokenKind::Number, "3.14".to_string())];
        let ast = parse(tokens).unwrap();
        assert_eq!(ast, AstNode::Number(3.14));
    }

    #[test]
    fn test_parse_paren() {
        let tokens = vec![
            Token::new(TokenKind::LParen, "(".to_string()),
            Token::new(TokenKind::Number, "42".to_string()),
            Token::new(TokenKind::RParen, ")".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        assert_eq!(ast, AstNode::Number(42.0));
    }

    #[test]
    fn test_parse_double_paren() {
        let tokens = vec![
            Token::new(TokenKind::LParen, "(".to_string()),
            Token::new(TokenKind::LParen, "(".to_string()),
            Token::new(TokenKind::Number, "7".to_string()),
            Token::new(TokenKind::RParen, ")".to_string()),
            Token::new(TokenKind::RParen, ")".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        assert_eq!(ast, AstNode::Number(7.0));
    }

    #[test]
    fn test_parse_addition() {
        let tokens = vec![
            Token::new(TokenKind::Number, "2".to_string()),
            Token::new(TokenKind::Plus, "+".to_string()),
            Token::new(TokenKind::Number, "3".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "+");
                assert_eq!(*left, AstNode::Number(2.0));
                assert_eq!(*right, AstNode::Number(3.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_subtraction() {
        let tokens = vec![
            Token::new(TokenKind::Number, "5".to_string()),
            Token::new(TokenKind::Minus, "-".to_string()),
            Token::new(TokenKind::Number, "1".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "-");
                assert_eq!(*left, AstNode::Number(5.0));
                assert_eq!(*right, AstNode::Number(1.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_multiplication() {
        let tokens = vec![
            Token::new(TokenKind::Number, "4".to_string()),
            Token::new(TokenKind::Star, "*".to_string()),
            Token::new(TokenKind::Number, "6".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "*");
                assert_eq!(*left, AstNode::Number(4.0));
                assert_eq!(*right, AstNode::Number(6.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_division() {
        let tokens = vec![
            Token::new(TokenKind::Number, "10".to_string()),
            Token::new(TokenKind::Slash, "/".to_string()),
            Token::new(TokenKind::Number, "2".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "/");
                assert_eq!(*left, AstNode::Number(10.0));
                assert_eq!(*right, AstNode::Number(2.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_modulo() {
        let tokens = vec![
            Token::new(TokenKind::Number, "10".to_string()),
            Token::new(TokenKind::Percent, "%".to_string()),
            Token::new(TokenKind::Number, "3".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "%");
                assert_eq!(*left, AstNode::Number(10.0));
                assert_eq!(*right, AstNode::Number(3.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_power() {
        let tokens = vec![
            Token::new(TokenKind::Number, "2".to_string()),
            Token::new(TokenKind::Power, "**".to_string()),
            Token::new(TokenKind::Number, "3".to_string()),
        ];
        let ast = parse(tokens).unwrap();
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "**");
                assert_eq!(*left, AstNode::Number(2.0));
                assert_eq!(*right, AstNode::Number(3.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_precedence_add_mul() {
        let tokens = tokenize("2 + 3 * 4").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "+");
                assert_eq!(*left, AstNode::Number(2.0));
                
                if let AstNode::Binary { op: op2, left: left2, right: right2 } = right.as_ref() {
                    assert_eq!(op2, "*");
                    assert_eq!(**left2, AstNode::Number(3.0));
                    assert_eq!(**right2, AstNode::Number(4.0));
                } else {
                    panic!("Expected binary for right");
                }
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_precedence_mul_power() {
        let tokens = tokenize("2 * 3 ** 2").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "*");
                assert_eq!(*left, AstNode::Number(2.0));
                
                if let AstNode::Binary { op: op2, left: left2, right: right2 } = right.as_ref() {
                    assert_eq!(op2, "**");
                    assert_eq!(**left2, AstNode::Number(3.0));
                    assert_eq!(**right2, AstNode::Number(2.0));
                } else {
                    panic!("Expected binary for right");
                }
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_precedence_paren() {
        let tokens = tokenize("(2 + 3) * 4").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "*");
                
                if let AstNode::Binary { op: op2, left: left2, right: right2 } = left.as_ref() {
                    assert_eq!(op2, "+");
                    assert_eq!(**left2, AstNode::Number(2.0));
                    assert_eq!(**right2, AstNode::Number(3.0));
                } else {
                    panic!("Expected binary for left");
                }
                
                assert_eq!(*right, AstNode::Number(4.0));
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_left_assoc_subtraction() {
        let tokens = tokenize("1 - 2 - 3").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "-");
                assert_eq!(*right, AstNode::Number(3.0));
                
                if let AstNode::Binary { op: op2, left: left2, right: right2 } = left.as_ref() {
                    assert_eq!(op2, "-");
                    assert_eq!(**left2, AstNode::Number(1.0));
                    assert_eq!(**right2, AstNode::Number(2.0));
                } else {
                    panic!("Expected binary for left");
                }
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_left_assoc_division() {
        let tokens = tokenize("12 / 3 / 2").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "/");
                assert_eq!(*right, AstNode::Number(2.0));
                
                if let AstNode::Binary { op: op2, left: left2, right: right2 } = left.as_ref() {
                    assert_eq!(op2, "/");
                    assert_eq!(**left2, AstNode::Number(12.0));
                    assert_eq!(**right2, AstNode::Number(3.0));
                } else {
                    panic!("Expected binary for left");
                }
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_right_assoc_power() {
        let tokens = tokenize("2 ** 3 ** 2").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "**");
                assert_eq!(*left, AstNode::Number(2.0));
                
                if let AstNode::Binary { op: op2, left: left2, right: right2 } = right.as_ref() {
                    assert_eq!(op2, "**");
                    assert_eq!(**left2, AstNode::Number(3.0));
                    assert_eq!(**right2, AstNode::Number(2.0));
                } else {
                    panic!("Expected binary for right");
                }
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_unary_minus() {
        let tokens = tokenize("-5").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Unary { op, operand } => {
                assert_eq!(op, "-");
                assert_eq!(*operand, AstNode::Number(5.0));
            }
            _ => panic!("Expected unary expression"),
        }
    }

    #[test]
    fn test_parse_double_unary_minus() {
        let tokens = tokenize("--5").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Unary { op, operand } => {
                assert_eq!(op, "-");
                if let AstNode::Unary { op: op2, operand: op2_inner } = operand.as_ref() {
                    assert_eq!(op2, "-");
                    assert_eq!(**op2_inner, AstNode::Number(5.0));
                } else {
                    panic!("Expected nested unary");
                }
            }
            _ => panic!("Expected unary expression"),
        }
    }

    #[test]
    fn test_parse_unary_in_binary() {
        let tokens = tokenize("2 * -3").unwrap();
        let ast = parse(tokens).unwrap();
        
        match ast {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "*");
                assert_eq!(*left, AstNode::Number(2.0));
                
                if let AstNode::Unary { op: op2, operand } = right.as_ref() {
                    assert_eq!(op2, "-");
                    assert_eq!(**operand, AstNode::Number(3.0));
                } else {
                    panic!("Expected unary for right");
                }
            }
            _ => panic!("Expected binary expression"),
        }
    }

    #[test]
    fn test_parse_error_empty() {
        let result = parse(vec![]);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_error_unmatched_paren() {
        let tokens = tokenize("(2 + 3").unwrap();
        let result = parse(tokens);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_error_trailing_paren() {
        let tokens = tokenize("2 + 3)").unwrap();
        let result = parse(tokens);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_error_leading_operator() {
        let tokens = tokenize("* 5").unwrap();
        let result = parse(tokens);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_error_trailing_operator() {
        let tokens = tokenize("2 +").unwrap();
        let result = parse(tokens);
        assert!(result.is_err());
    }

    // Evaluator tests
    #[test]
    fn test_eval_number() {
        let node = AstNode::Number(42.0);
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 42.0);
    }

    #[test]
    fn test_eval_unary_minus() {
        let node = AstNode::Unary {
            op: "-".to_string(),
            operand: Box::new(AstNode::Number(5.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, -5.0);
    }

    #[test]
    fn test_eval_addition() {
        let node = AstNode::Binary {
            op: "+".to_string(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 5.0);
    }

    #[test]
    fn test_eval_subtraction() {
        let node = AstNode::Binary {
            op: "-".to_string(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(4.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 6.0);
    }

    #[test]
    fn test_eval_multiplication() {
        let node = AstNode::Binary {
            op: "*".to_string(),
            left: Box::new(AstNode::Number(3.0)),
            right: Box::new(AstNode::Number(7.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 21.0);
    }

    #[test]
    fn test_eval_division() {
        let node = AstNode::Binary {
            op: "/".to_string(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(4.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 2.5);
    }

    #[test]
    fn test_eval_modulo() {
        let node = AstNode::Binary {
            op: "%".to_string(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 1.0);
    }

    #[test]
    fn test_eval_power() {
        let node = AstNode::Binary {
            op: "**".to_string(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(10.0)),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, 1024.0);
    }

    #[test]
    fn test_eval_div_by_zero() {
        let node = AstNode::Binary {
            op: "/".to_string(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let result = evaluate(&node);
        assert!(result.is_err());
    }

    #[test]
    fn test_eval_mod_by_zero() {
        let node = AstNode::Binary {
            op: "%".to_string(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let result = evaluate(&node);
        assert!(result.is_err());
    }

    #[test]
    fn test_eval_complex() {
        let node = AstNode::Binary {
            op: "*".to_string(),
            left: Box::new(AstNode::Binary {
                op: "+".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Number(3.0)),
            }),
            right: Box::new(AstNode::Unary {
                op: "-".to_string(),
                operand: Box::new(AstNode::Number(4.0)),
            }),
        };
        let result = evaluate(&node).unwrap();
        assert_eq!(result, -20.0);
    }

    // End-to-end calc tests
    #[test]
    fn test_calc_simple_addition() {
        let result = calc("1 + 2").unwrap();
        assert_eq!(result, 3.0);
    }

    #[test]
    fn test_calc_subtraction() {
        let result = calc("10 - 3").unwrap();
        assert_eq!(result, 7.0);
    }

    #[test]
    fn test_calc_multiplication() {
        let result = calc("4 * 5").unwrap();
        assert_eq!(result, 20.0);
    }

    #[test]
    fn test_calc_division() {
        let result = calc("15 / 4").unwrap();
        assert_eq!(result, 3.75);
    }

    #[test]
    fn test_calc_modulo() {
        let result = calc("10 % 3").unwrap();
        assert_eq!(result, 1.0);
    }

    #[test]
    fn test_calc_power() {
        let result = calc("2 ** 8").unwrap();
        assert_eq!(result, 256.0);
    }

    #[test]
    fn test_calc_precedence_add_mul() {
        let result = calc("2 + 3 * 4").unwrap();
        assert_eq!(result, 14.0);
    }

    #[test]
    fn test_calc_precedence_mul_add() {
        let result = calc("2 * 3 + 4").unwrap();
        assert_eq!(result, 10.0);
    }

    #[test]
    fn test_calc_precedence_sub_mul() {
        let result = calc("10 - 2 * 3").unwrap();
        assert_eq!(result, 4.0);
    }

    #[test]
    fn test_calc_precedence_add_power() {
        let result = calc("2 + 3 ** 2").unwrap();
        assert_eq!(result, 11.0);
    }

    #[test]
    fn test_calc_precedence_mul_power() {
        let result = calc("2 * 3 ** 2").unwrap();
        assert_eq!(result, 18.0);
    }

    #[test]
    fn test_calc_precedence_power_mul() {
        let result = calc("2 ** 3 * 4").unwrap();
        assert_eq!(result, 32.0);
    }

    #[test]
    fn test_calc_paren_add_mul() {
        let result = calc("(2 + 3) * 4").unwrap();
        assert_eq!(result, 20.0);
    }

    #[test]
    fn test_calc_paren_mul_add() {
        let result = calc("2 * (3 + 4)").unwrap();
        assert_eq!(result, 14.0);
    }

    #[test]
    fn test_calc_paren_multiple() {
        let result = calc("(2 + 3) * (4 + 5)").unwrap();
        assert_eq!(result, 45.0);
    }

    #[test]
    fn test_calc_nested_paren() {
        let result = calc("((1 + 2) * (3 + 4))").unwrap();
        assert_eq!(result, 21.0);
    }

    #[test]
    fn test_calc_simple_paren() {
        let result = calc("(10)").unwrap();
        assert_eq!(result, 10.0);
    }

    #[test]
    fn test_calc_left_assoc_subtraction() {
        let result = calc("1 - 2 - 3").unwrap();
        assert_eq!(result, -4.0);
    }

    #[test]
    fn test_calc_left_assoc_add_sub() {
        let result = calc("1 - 2 + 3").unwrap();
        assert_eq!(result, 2.0);
    }

    #[test]
    fn test_calc_left_assoc_division() {
        let result = calc("12 / 3 / 2").unwrap();
        assert_eq!(result, 2.0);
    }

    #[test]
    fn test_calc_right_assoc_power() {
        let result = calc("2 ** 3 ** 2").unwrap();
        assert_eq!(result, 512.0);
    }

    #[test]
    fn test_calc_unary_minus() {
        let result = calc("-5").unwrap();
        assert_eq!(result, -5.0);
    }

    #[test]
    fn test_calc_double_unary_minus() {
        let result = calc("--5").unwrap();
        assert_eq!(result, 5.0);
    }

    #[test]
    fn test_calc_unary_in_paren() {
        let result = calc("-(-5)").unwrap();
        assert_eq!(result, 5.0);
    }

    #[test]
    fn test_calc_unary_in_binary() {
        let result = calc("2 * -3").unwrap();
        assert_eq!(result, -6.0);
    }

    #[test]
    fn test_calc_unary_power() {
        let result = calc("-2 ** 2").unwrap();
        assert_eq!(result, 4.0);
    }

    #[test]
    fn test_calc_unary_power_paren() {
        let result = calc("-(2 ** 2)").unwrap();
        assert_eq!(result, -4.0);
    }

    #[test]
    fn test_calc_float_mul() {
        let result = calc("3.14 * 2").unwrap();
        assert!((result - 6.28).abs() < 0.0001);
    }

    #[test]
    fn test_calc_leading_dot() {
        let result = calc(".5 + .5").unwrap();
        assert_eq!(result, 1.0);
    }

    #[test]
    fn test_calc_complex_expr() {
        let result = calc("2 + 3 * 4 - 1").unwrap();
        assert_eq!(result, 13.0);
    }

    #[test]
    fn test_calc_complex_expr_paren() {
        let result = calc("(2 + 3) * (4 - 1) / 5").unwrap();
        assert_eq!(result, 3.0);
    }

    #[test]
    fn test_calc_complex_modulo() {
        let result = calc("10 % 3 + 2 ** 3").unwrap();
        assert_eq!(result, 9.0);
    }

    #[test]
    fn test_calc_complex_power_paren() {
        let result = calc("2 ** (1 + 2)").unwrap();
        assert_eq!(result, 8.0);
    }

    #[test]
    fn test_calc_complex_division() {
        let result = calc("100 / 10 / 2 + 3").unwrap();
        assert_eq!(result, 8.0);
    }

    #[test]
    fn test_calc_error_empty() {
        let result = calc("");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_whitespace() {
        let result = calc("   ");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_div_by_zero() {
        let result = calc("1 / 0");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_mod_by_zero() {
        let result = calc("5 % 0");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_unmatched_paren() {
        let result = calc("(2 + 3");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_invalid_char() {
        let result = calc("2 @ 3");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_trailing_operator() {
        let result = calc("2 +");
        assert!(result.is_err());
    }
}
