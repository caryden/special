// Token types

#[derive(Debug, Clone, PartialEq)]
enum TokenKind {
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
struct Token {
    kind: TokenKind,
    value: String,
}

// AST types

#[derive(Debug, Clone, PartialEq)]
enum AstNode {
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

// Tokenizer

fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        // Skip whitespace
        if ch.is_whitespace() {
            i += 1;
            continue;
        }

        // Numbers
        if ch.is_ascii_digit() || ch == '.' {
            let start = i;
            let mut has_decimal = ch == '.';
            i += 1;

            while i < chars.len() {
                let c = chars[i];
                if c.is_ascii_digit() {
                    i += 1;
                } else if c == '.' {
                    if has_decimal {
                        return Err(format!("Unexpected character {}", c));
                    }
                    has_decimal = true;
                    i += 1;
                } else {
                    break;
                }
            }

            let value: String = chars[start..i].iter().collect();
            tokens.push(Token {
                kind: TokenKind::Number,
                value,
            });
            continue;
        }

        // Operators and parentheses
        match ch {
            '+' => {
                tokens.push(Token {
                    kind: TokenKind::Plus,
                    value: "+".to_string(),
                });
                i += 1;
            }
            '-' => {
                tokens.push(Token {
                    kind: TokenKind::Minus,
                    value: "-".to_string(),
                });
                i += 1;
            }
            '*' => {
                // Check for ** (power)
                if i + 1 < chars.len() && chars[i + 1] == '*' {
                    tokens.push(Token {
                        kind: TokenKind::Power,
                        value: "**".to_string(),
                    });
                    i += 2;
                } else {
                    tokens.push(Token {
                        kind: TokenKind::Star,
                        value: "*".to_string(),
                    });
                    i += 1;
                }
            }
            '/' => {
                tokens.push(Token {
                    kind: TokenKind::Slash,
                    value: "/".to_string(),
                });
                i += 1;
            }
            '%' => {
                tokens.push(Token {
                    kind: TokenKind::Percent,
                    value: "%".to_string(),
                });
                i += 1;
            }
            '(' => {
                tokens.push(Token {
                    kind: TokenKind::LParen,
                    value: "(".to_string(),
                });
                i += 1;
            }
            ')' => {
                tokens.push(Token {
                    kind: TokenKind::RParen,
                    value: ")".to_string(),
                });
                i += 1;
            }
            _ => {
                return Err(format!("Unexpected character {} at position {}", ch, i));
            }
        }
    }

    Ok(tokens)
}

// Parser

struct Parser {
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

    fn parse(&mut self) -> Result<AstNode, String> {
        if self.tokens.is_empty() {
            return Err("Unexpected end of input".to_string());
        }

        let expr = self.parse_additive()?;

        if self.current().is_some() {
            return Err("Unexpected token after expression".to_string());
        }

        Ok(expr)
    }

    // Level 1: Addition and subtraction (left-associative)
    fn parse_additive(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_multiplicative()?;

        while let Some(token) = self.current() {
            match token.kind {
                TokenKind::Plus | TokenKind::Minus => {
                    let op = token.value.clone();
                    self.advance();
                    let right = self.parse_multiplicative()?;
                    left = AstNode::Binary {
                        op,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                _ => break,
            }
        }

        Ok(left)
    }

    // Level 2: Multiplication, division, modulo (left-associative)
    fn parse_multiplicative(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_power()?;

        while let Some(token) = self.current() {
            match token.kind {
                TokenKind::Star | TokenKind::Slash | TokenKind::Percent => {
                    let op = token.value.clone();
                    self.advance();
                    let right = self.parse_power()?;
                    left = AstNode::Binary {
                        op,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                _ => break,
            }
        }

        Ok(left)
    }

    // Level 3: Exponentiation (right-associative)
    fn parse_power(&mut self) -> Result<AstNode, String> {
        let left = self.parse_unary()?;

        if let Some(token) = self.current() {
            if token.kind == TokenKind::Power {
                let op = token.value.clone();
                self.advance();
                let right = self.parse_power()?; // Right-associative
                return Ok(AstNode::Binary {
                    op,
                    left: Box::new(left),
                    right: Box::new(right),
                });
            }
        }

        Ok(left)
    }

    // Level 4: Unary minus (right-associative, prefix)
    fn parse_unary(&mut self) -> Result<AstNode, String> {
        if let Some(token) = self.current() {
            if token.kind == TokenKind::Minus {
                let op = token.value.clone();
                self.advance();
                let operand = self.parse_unary()?; // Right-associative (can chain)
                return Ok(AstNode::Unary {
                    op,
                    operand: Box::new(operand),
                });
            }
        }

        self.parse_atom()
    }

    // Level 5: Atoms (numbers and parenthesized expressions)
    fn parse_atom(&mut self) -> Result<AstNode, String> {
        let token = self
            .current()
            .ok_or_else(|| "Unexpected end of input".to_string())?;

        match token.kind {
            TokenKind::Number => {
                let value = token
                    .value
                    .parse::<f64>()
                    .map_err(|_| "Invalid number".to_string())?;
                self.advance();
                Ok(AstNode::Number(value))
            }
            TokenKind::LParen => {
                self.advance();
                let expr = self.parse_additive()?;
                let token = self
                    .current()
                    .ok_or_else(|| "Expected rparen".to_string())?;
                if token.kind != TokenKind::RParen {
                    return Err("Expected rparen".to_string());
                }
                self.advance();
                Ok(expr)
            }
            _ => Err(format!("Unexpected token: {:?}", token.kind)),
        }
    }
}

fn parse(tokens: &[Token]) -> Result<AstNode, String> {
    let mut parser = Parser::new(tokens.to_vec());
    parser.parse()
}

// Evaluator

fn evaluate(ast: &AstNode) -> Result<f64, String> {
    match ast {
        AstNode::Number(value) => Ok(*value),
        AstNode::Unary { op, operand } => {
            let operand_value = evaluate(operand)?;
            if op == "-" {
                Ok(-operand_value)
            } else {
                Err(format!("Unknown unary operator: {}", op))
            }
        }
        AstNode::Binary { op, left, right } => {
            let left_value = evaluate(left)?;
            let right_value = evaluate(right)?;

            match op.as_str() {
                "+" => Ok(left_value + right_value),
                "-" => Ok(left_value - right_value),
                "*" => Ok(left_value * right_value),
                "/" => {
                    if right_value == 0.0 {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(left_value / right_value)
                    }
                }
                "%" => {
                    if right_value == 0.0 {
                        Err("Modulo by zero".to_string())
                    } else {
                        Ok(left_value % right_value)
                    }
                }
                "**" => Ok(left_value.powf(right_value)),
                _ => Err(format!("Unknown binary operator: {}", op)),
            }
        }
    }
}

// Public API

pub fn calc(expression: &str) -> Result<f64, String> {
    let trimmed = expression.trim();
    if trimmed.is_empty() {
        return Err("Empty expression".to_string());
    }

    let tokens = tokenize(expression)?;
    let ast = parse(&tokens)?;
    evaluate(&ast)
}

// Tests

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to create tokens
    fn tok(kind: TokenKind, value: &str) -> Token {
        Token {
            kind,
            value: value.to_string(),
        }
    }

    // Tokenizer tests

    #[test]
    fn test_tokenize_empty() {
        assert_eq!(tokenize("").unwrap(), vec![]);
    }

    #[test]
    fn test_tokenize_whitespace() {
        assert_eq!(tokenize("   \t\n  ").unwrap(), vec![]);
    }

    #[test]
    fn test_tokenize_number() {
        assert_eq!(tokenize("42").unwrap(), vec![tok(TokenKind::Number, "42")]);
    }

    #[test]
    fn test_tokenize_decimal() {
        assert_eq!(
            tokenize("3.14").unwrap(),
            vec![tok(TokenKind::Number, "3.14")]
        );
    }

    #[test]
    fn test_tokenize_leading_decimal() {
        assert_eq!(tokenize(".5").unwrap(), vec![tok(TokenKind::Number, ".5")]);
    }

    #[test]
    fn test_tokenize_operators() {
        assert_eq!(
            tokenize("+ - * / % **").unwrap(),
            vec![
                tok(TokenKind::Plus, "+"),
                tok(TokenKind::Minus, "-"),
                tok(TokenKind::Star, "*"),
                tok(TokenKind::Slash, "/"),
                tok(TokenKind::Percent, "%"),
                tok(TokenKind::Power, "**"),
            ]
        );
    }

    #[test]
    fn test_tokenize_parens() {
        assert_eq!(
            tokenize("(1)").unwrap(),
            vec![
                tok(TokenKind::LParen, "("),
                tok(TokenKind::Number, "1"),
                tok(TokenKind::RParen, ")"),
            ]
        );
    }

    #[test]
    fn test_tokenize_expression() {
        assert_eq!(
            tokenize("2 + 3 * (4 - 1)").unwrap(),
            vec![
                tok(TokenKind::Number, "2"),
                tok(TokenKind::Plus, "+"),
                tok(TokenKind::Number, "3"),
                tok(TokenKind::Star, "*"),
                tok(TokenKind::LParen, "("),
                tok(TokenKind::Number, "4"),
                tok(TokenKind::Minus, "-"),
                tok(TokenKind::Number, "1"),
                tok(TokenKind::RParen, ")"),
            ]
        );
    }

    #[test]
    fn test_tokenize_power_star() {
        assert_eq!(
            tokenize("2**3*4").unwrap(),
            vec![
                tok(TokenKind::Number, "2"),
                tok(TokenKind::Power, "**"),
                tok(TokenKind::Number, "3"),
                tok(TokenKind::Star, "*"),
                tok(TokenKind::Number, "4"),
            ]
        );
    }

    #[test]
    fn test_tokenize_no_spaces() {
        assert_eq!(
            tokenize("1+2").unwrap(),
            vec![
                tok(TokenKind::Number, "1"),
                tok(TokenKind::Plus, "+"),
                tok(TokenKind::Number, "2"),
            ]
        );
    }

    #[test]
    fn test_tokenize_error_double_decimal() {
        let result = tokenize("1.2.3");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected character"));
    }

    #[test]
    fn test_tokenize_error_invalid_char() {
        let result = tokenize("2 @ 3");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Unexpected character"));
        assert!(err.contains("@"));
        assert!(err.contains("position 2"));
    }

    // Parser tests

    #[test]
    fn test_parse_number() {
        let tokens = tokenize("42").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(ast, AstNode::Number(42.0));
    }

    #[test]
    fn test_parse_decimal() {
        let tokens = tokenize("3.14").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(ast, AstNode::Number(3.14));
    }

    #[test]
    fn test_parse_parens_single() {
        let tokens = tokenize("(42)").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(ast, AstNode::Number(42.0));
    }

    #[test]
    fn test_parse_parens_double() {
        let tokens = tokenize("((7))").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(ast, AstNode::Number(7.0));
    }

    #[test]
    fn test_parse_addition() {
        let tokens = tokenize("2 + 3").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "+".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn test_parse_subtraction() {
        let tokens = tokenize("5 - 1").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "-".to_string(),
                left: Box::new(AstNode::Number(5.0)),
                right: Box::new(AstNode::Number(1.0)),
            }
        );
    }

    #[test]
    fn test_parse_multiplication() {
        let tokens = tokenize("4 * 6").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "*".to_string(),
                left: Box::new(AstNode::Number(4.0)),
                right: Box::new(AstNode::Number(6.0)),
            }
        );
    }

    #[test]
    fn test_parse_division() {
        let tokens = tokenize("10 / 2").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "/".to_string(),
                left: Box::new(AstNode::Number(10.0)),
                right: Box::new(AstNode::Number(2.0)),
            }
        );
    }

    #[test]
    fn test_parse_modulo() {
        let tokens = tokenize("10 % 3").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "%".to_string(),
                left: Box::new(AstNode::Number(10.0)),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn test_parse_power() {
        let tokens = tokenize("2 ** 3").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "**".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn test_parse_precedence_add_mul() {
        let tokens = tokenize("2 + 3 * 4").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "+".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Binary {
                    op: "*".to_string(),
                    left: Box::new(AstNode::Number(3.0)),
                    right: Box::new(AstNode::Number(4.0)),
                }),
            }
        );
    }

    #[test]
    fn test_parse_precedence_mul_power() {
        let tokens = tokenize("2 * 3 ** 2").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "*".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Binary {
                    op: "**".to_string(),
                    left: Box::new(AstNode::Number(3.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }),
            }
        );
    }

    #[test]
    fn test_parse_precedence_parens() {
        let tokens = tokenize("(2 + 3) * 4").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "*".to_string(),
                left: Box::new(AstNode::Binary {
                    op: "+".to_string(),
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }),
                right: Box::new(AstNode::Number(4.0)),
            }
        );
    }

    #[test]
    fn test_parse_associativity_sub_left() {
        let tokens = tokenize("1 - 2 - 3").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "-".to_string(),
                left: Box::new(AstNode::Binary {
                    op: "-".to_string(),
                    left: Box::new(AstNode::Number(1.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn test_parse_associativity_div_left() {
        let tokens = tokenize("12 / 3 / 2").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "/".to_string(),
                left: Box::new(AstNode::Binary {
                    op: "/".to_string(),
                    left: Box::new(AstNode::Number(12.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }),
                right: Box::new(AstNode::Number(2.0)),
            }
        );
    }

    #[test]
    fn test_parse_associativity_power_right() {
        let tokens = tokenize("2 ** 3 ** 2").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "**".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Binary {
                    op: "**".to_string(),
                    left: Box::new(AstNode::Number(3.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }),
            }
        );
    }

    #[test]
    fn test_parse_unary_minus() {
        let tokens = tokenize("-5").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Unary {
                op: "-".to_string(),
                operand: Box::new(AstNode::Number(5.0)),
            }
        );
    }

    #[test]
    fn test_parse_unary_double_minus() {
        let tokens = tokenize("--5").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Unary {
                op: "-".to_string(),
                operand: Box::new(AstNode::Unary {
                    op: "-".to_string(),
                    operand: Box::new(AstNode::Number(5.0)),
                }),
            }
        );
    }

    #[test]
    fn test_parse_unary_in_binary() {
        let tokens = tokenize("2 * -3").unwrap();
        let ast = parse(&tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Binary {
                op: "*".to_string(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Unary {
                    op: "-".to_string(),
                    operand: Box::new(AstNode::Number(3.0)),
                }),
            }
        );
    }

    #[test]
    fn test_parse_error_empty() {
        let tokens = vec![];
        let result = parse(&tokens);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected end of input"));
    }

    #[test]
    fn test_parse_error_unclosed_paren() {
        let tokens = tokenize("(2 + 3").unwrap();
        let result = parse(&tokens);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Expected rparen"));
    }

    #[test]
    fn test_parse_error_extra_closing_paren() {
        let tokens = tokenize("2 + 3)").unwrap();
        let result = parse(&tokens);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected token after expression"));
    }

    #[test]
    fn test_parse_error_unexpected_operator() {
        let tokens = tokenize("* 5").unwrap();
        let result = parse(&tokens);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected token"));
    }

    #[test]
    fn test_parse_error_trailing_operator() {
        let tokens = tokenize("2 +").unwrap();
        let result = parse(&tokens);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected end of input"));
    }

    // Evaluator tests

    #[test]
    fn test_evaluate_number() {
        let ast = AstNode::Number(42.0);
        assert_eq!(evaluate(&ast).unwrap(), 42.0);
    }

    #[test]
    fn test_evaluate_unary() {
        let ast = AstNode::Unary {
            op: "-".to_string(),
            operand: Box::new(AstNode::Number(5.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), -5.0);
    }

    #[test]
    fn test_evaluate_add() {
        let ast = AstNode::Binary {
            op: "+".to_string(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), 5.0);
    }

    #[test]
    fn test_evaluate_sub() {
        let ast = AstNode::Binary {
            op: "-".to_string(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(4.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), 6.0);
    }

    #[test]
    fn test_evaluate_mul() {
        let ast = AstNode::Binary {
            op: "*".to_string(),
            left: Box::new(AstNode::Number(3.0)),
            right: Box::new(AstNode::Number(7.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), 21.0);
    }

    #[test]
    fn test_evaluate_div() {
        let ast = AstNode::Binary {
            op: "/".to_string(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(4.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), 2.5);
    }

    #[test]
    fn test_evaluate_mod() {
        let ast = AstNode::Binary {
            op: "%".to_string(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), 1.0);
    }

    #[test]
    fn test_evaluate_power() {
        let ast = AstNode::Binary {
            op: "**".to_string(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(10.0)),
        };
        assert_eq!(evaluate(&ast).unwrap(), 1024.0);
    }

    #[test]
    fn test_evaluate_error_div_by_zero() {
        let ast = AstNode::Binary {
            op: "/".to_string(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let result = evaluate(&ast);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Division by zero"));
    }

    #[test]
    fn test_evaluate_error_mod_by_zero() {
        let ast = AstNode::Binary {
            op: "%".to_string(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let result = evaluate(&ast);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Modulo by zero"));
    }

    #[test]
    fn test_evaluate_complex() {
        // (2 + 3) * -4 = 5 * -4 = -20
        let ast = AstNode::Binary {
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
        assert_eq!(evaluate(&ast).unwrap(), -20.0);
    }

    // End-to-end tests (calc)

    #[test]
    fn test_calc_add() {
        assert_eq!(calc("1 + 2").unwrap(), 3.0);
    }

    #[test]
    fn test_calc_sub() {
        assert_eq!(calc("10 - 3").unwrap(), 7.0);
    }

    #[test]
    fn test_calc_mul() {
        assert_eq!(calc("4 * 5").unwrap(), 20.0);
    }

    #[test]
    fn test_calc_div() {
        assert_eq!(calc("15 / 4").unwrap(), 3.75);
    }

    #[test]
    fn test_calc_mod() {
        assert_eq!(calc("10 % 3").unwrap(), 1.0);
    }

    #[test]
    fn test_calc_power() {
        assert_eq!(calc("2 ** 8").unwrap(), 256.0);
    }

    #[test]
    fn test_calc_precedence_add_mul() {
        assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
    }

    #[test]
    fn test_calc_precedence_mul_add() {
        assert_eq!(calc("2 * 3 + 4").unwrap(), 10.0);
    }

    #[test]
    fn test_calc_precedence_sub_mul() {
        assert_eq!(calc("10 - 2 * 3").unwrap(), 4.0);
    }

    #[test]
    fn test_calc_precedence_add_power() {
        assert_eq!(calc("2 + 3 ** 2").unwrap(), 11.0);
    }

    #[test]
    fn test_calc_precedence_mul_power() {
        assert_eq!(calc("2 * 3 ** 2").unwrap(), 18.0);
    }

    #[test]
    fn test_calc_precedence_power_mul() {
        assert_eq!(calc("2 ** 3 * 4").unwrap(), 32.0);
    }

    #[test]
    fn test_calc_parens_add_mul() {
        assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
    }

    #[test]
    fn test_calc_parens_mul_add() {
        assert_eq!(calc("2 * (3 + 4)").unwrap(), 14.0);
    }

    #[test]
    fn test_calc_parens_both() {
        assert_eq!(calc("(2 + 3) * (4 + 5)").unwrap(), 45.0);
    }

    #[test]
    fn test_calc_parens_nested() {
        assert_eq!(calc("((1 + 2) * (3 + 4))").unwrap(), 21.0);
    }

    #[test]
    fn test_calc_parens_single() {
        assert_eq!(calc("(10)").unwrap(), 10.0);
    }

    #[test]
    fn test_calc_associativity_sub_left() {
        assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
    }

    #[test]
    fn test_calc_associativity_sub_add() {
        assert_eq!(calc("1 - 2 + 3").unwrap(), 2.0);
    }

    #[test]
    fn test_calc_associativity_div_left() {
        assert_eq!(calc("12 / 3 / 2").unwrap(), 2.0);
    }

    #[test]
    fn test_calc_associativity_power_right() {
        assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
    }

    #[test]
    fn test_calc_unary_minus() {
        assert_eq!(calc("-5").unwrap(), -5.0);
    }

    #[test]
    fn test_calc_unary_double_minus() {
        assert_eq!(calc("--5").unwrap(), 5.0);
    }

    #[test]
    fn test_calc_unary_parens() {
        assert_eq!(calc("-(-5)").unwrap(), 5.0);
    }

    #[test]
    fn test_calc_unary_in_binary() {
        assert_eq!(calc("2 * -3").unwrap(), -6.0);
    }

    #[test]
    fn test_calc_unary_power() {
        assert_eq!(calc("-2 ** 2").unwrap(), 4.0);
    }

    #[test]
    fn test_calc_unary_power_parens() {
        assert_eq!(calc("-(2 ** 2)").unwrap(), -4.0);
    }

    #[test]
    fn test_calc_decimal() {
        assert_eq!(calc("3.14 * 2").unwrap(), 6.28);
    }

    #[test]
    fn test_calc_leading_decimal() {
        assert_eq!(calc(".5 + .5").unwrap(), 1.0);
    }

    #[test]
    fn test_calc_complex1() {
        assert_eq!(calc("2 + 3 * 4 - 1").unwrap(), 13.0);
    }

    #[test]
    fn test_calc_complex2() {
        assert_eq!(calc("(2 + 3) * (4 - 1) / 5").unwrap(), 3.0);
    }

    #[test]
    fn test_calc_complex3() {
        assert_eq!(calc("10 % 3 + 2 ** 3").unwrap(), 9.0);
    }

    #[test]
    fn test_calc_complex4() {
        assert_eq!(calc("2 ** (1 + 2)").unwrap(), 8.0);
    }

    #[test]
    fn test_calc_complex5() {
        assert_eq!(calc("100 / 10 / 2 + 3").unwrap(), 8.0);
    }

    #[test]
    fn test_calc_error_empty() {
        let result = calc("");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Empty expression"));
    }

    #[test]
    fn test_calc_error_whitespace_only() {
        let result = calc("   ");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Empty expression"));
    }

    #[test]
    fn test_calc_error_div_by_zero() {
        let result = calc("1 / 0");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Division by zero"));
    }

    #[test]
    fn test_calc_error_mod_by_zero() {
        let result = calc("5 % 0");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Modulo by zero"));
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
    fn test_calc_error_unexpected_end() {
        let result = calc("2 +");
        assert!(result.is_err());
    }
}
