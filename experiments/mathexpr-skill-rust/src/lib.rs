// mathexpr — A math expression parser and evaluator.
// Zero external dependencies. All functions are pure.

// ── token-types ──

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
    pub fn new(kind: TokenKind, value: &str) -> Self {
        Token {
            kind,
            value: value.to_string(),
        }
    }
}

// ── ast-types ──

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

// ── tokenizer ──

pub fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let chars: Vec<char> = input.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        // Skip whitespace
        if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
            i += 1;
            continue;
        }

        // Numbers: digits or leading dot
        if ch.is_ascii_digit() || (ch == '.' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit())
            || (ch == '.' && i + 1 == chars.len())
        {
            // Actually, a lone trailing dot should still be captured as start of number
            // but let's handle it: consume digits and at most one dot
            if ch == '.' && i + 1 == chars.len() {
                // A lone dot at end — not a valid start for anything else, treat as number ".":
                // Actually per spec, ".5" is valid. A lone "." would just be ".". Let's consume it.
            }
            let start = i;
            let mut has_dot = false;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                if chars[i] == '.' {
                    if has_dot {
                        return Err(format!("Unexpected character `.` at position {}", i));
                    }
                    has_dot = true;
                }
                i += 1;
            }
            let value: String = chars[start..i].iter().collect();
            tokens.push(Token::new(TokenKind::Number, &value));
            continue;
        }

        // Two-character operator: **
        if ch == '*' && i + 1 < chars.len() && chars[i + 1] == '*' {
            tokens.push(Token::new(TokenKind::Power, "**"));
            i += 2;
            continue;
        }

        // Single-character operators and parens
        match ch {
            '+' => {
                tokens.push(Token::new(TokenKind::Plus, "+"));
                i += 1;
            }
            '-' => {
                tokens.push(Token::new(TokenKind::Minus, "-"));
                i += 1;
            }
            '*' => {
                tokens.push(Token::new(TokenKind::Star, "*"));
                i += 1;
            }
            '/' => {
                tokens.push(Token::new(TokenKind::Slash, "/"));
                i += 1;
            }
            '%' => {
                tokens.push(Token::new(TokenKind::Percent, "%"));
                i += 1;
            }
            '(' => {
                tokens.push(Token::new(TokenKind::LParen, "("));
                i += 1;
            }
            ')' => {
                tokens.push(Token::new(TokenKind::RParen, ")"));
                i += 1;
            }
            _ => {
                return Err(format!("Unexpected character `{}` at position {}", ch, i));
            }
        }
    }

    Ok(tokens)
}

// ── parser ──

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Parser { tokens, pos: 0 }
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }

    fn advance(&mut self) -> Option<&Token> {
        let tok = self.tokens.get(self.pos);
        if tok.is_some() {
            self.pos += 1;
        }
        tok
    }

    fn parse_expression(&mut self) -> Result<AstNode, String> {
        self.parse_add_sub()
    }

    // Level 1: + and - (left-associative)
    fn parse_add_sub(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_mul_div()?;

        while let Some(tok) = self.peek() {
            match tok.kind {
                TokenKind::Plus | TokenKind::Minus => {
                    let op = tok.value.clone();
                    self.advance();
                    let right = self.parse_mul_div()?;
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

    // Level 2: *, /, % (left-associative)
    fn parse_mul_div(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_power()?;

        while let Some(tok) = self.peek() {
            match tok.kind {
                TokenKind::Star | TokenKind::Slash | TokenKind::Percent => {
                    let op = tok.value.clone();
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

    // Level 3: ** (right-associative)
    fn parse_power(&mut self) -> Result<AstNode, String> {
        let base = self.parse_unary()?;

        if let Some(tok) = self.peek() {
            if tok.kind == TokenKind::Power {
                let op = tok.value.clone();
                self.advance();
                // Right-associative: recurse into parse_power, not parse_unary
                let exponent = self.parse_power()?;
                return Ok(AstNode::Binary {
                    op,
                    left: Box::new(base),
                    right: Box::new(exponent),
                });
            }
        }

        Ok(base)
    }

    // Level 4: unary - (prefix)
    fn parse_unary(&mut self) -> Result<AstNode, String> {
        if let Some(tok) = self.peek() {
            if tok.kind == TokenKind::Minus {
                let op = tok.value.clone();
                self.advance();
                let operand = self.parse_unary()?;
                return Ok(AstNode::Unary {
                    op,
                    operand: Box::new(operand),
                });
            }
        }

        self.parse_atom()
    }

    // Level 5: numbers and parenthesized expressions
    fn parse_atom(&mut self) -> Result<AstNode, String> {
        let tok = match self.peek() {
            Some(t) => t.clone(),
            None => return Err("Unexpected end of input".to_string()),
        };

        match tok.kind {
            TokenKind::Number => {
                self.advance();
                let value: f64 = tok
                    .value
                    .parse()
                    .map_err(|_| format!("Invalid number: {}", tok.value))?;
                Ok(AstNode::Number(value))
            }
            TokenKind::LParen => {
                self.advance(); // consume '('
                let expr = self.parse_expression()?;
                // expect ')'
                match self.peek() {
                    Some(t) if t.kind == TokenKind::RParen => {
                        self.advance();
                        Ok(expr)
                    }
                    _ => Err("Expected rparen".to_string()),
                }
            }
            _ => Err(format!("Unexpected token: {:?} '{}'", tok.kind, tok.value)),
        }
    }
}

pub fn parse(tokens: Vec<Token>) -> Result<AstNode, String> {
    let mut parser = Parser::new(tokens);
    let ast = parser.parse_expression()?;

    // Verify all tokens are consumed
    if parser.pos < parser.tokens.len() {
        return Err("Unexpected token after expression".to_string());
    }

    Ok(ast)
}

// ── evaluator ──

pub fn evaluate(node: &AstNode) -> Result<f64, String> {
    match node {
        AstNode::Number(value) => Ok(*value),
        AstNode::Unary { op, operand } => {
            let val = evaluate(operand)?;
            match op.as_str() {
                "-" => Ok(-val),
                _ => Err(format!("Unknown unary operator: {}", op)),
            }
        }
        AstNode::Binary {
            op,
            left,
            right,
        } => {
            let l = evaluate(left)?;
            let r = evaluate(right)?;
            match op.as_str() {
                "+" => Ok(l + r),
                "-" => Ok(l - r),
                "*" => Ok(l * r),
                "/" => {
                    if r == 0.0 {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(l / r)
                    }
                }
                "%" => {
                    if r == 0.0 {
                        Err("Modulo by zero".to_string())
                    } else {
                        Ok(l % r)
                    }
                }
                "**" => Ok(l.powf(r)),
                _ => Err(format!("Unknown binary operator: {}", op)),
            }
        }
    }
}

// ── evaluate (public API) ──

pub fn calc(expression: &str) -> Result<f64, String> {
    let trimmed = expression.trim();
    if trimmed.is_empty() {
        return Err("Empty expression".to_string());
    }
    let tokens = tokenize(trimmed)?;
    let ast = parse(tokens)?;
    evaluate(&ast)
}

// ── tests ──

#[cfg(test)]
mod tests {
    use super::*;

    // -- token-types tests --

    #[test]
    fn test_token_creation() {
        let t = Token::new(TokenKind::Number, "42");
        assert_eq!(t.kind, TokenKind::Number);
        assert_eq!(t.value, "42");

        let t = Token::new(TokenKind::Plus, "+");
        assert_eq!(t.kind, TokenKind::Plus);
        assert_eq!(t.value, "+");
    }

    // -- tokenizer tests --

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
        let tokens = tokenize("42").unwrap();
        assert_eq!(tokens, vec![Token::new(TokenKind::Number, "42")]);
    }

    #[test]
    fn test_tokenize_decimal() {
        let tokens = tokenize("3.14").unwrap();
        assert_eq!(tokens, vec![Token::new(TokenKind::Number, "3.14")]);
    }

    #[test]
    fn test_tokenize_leading_dot() {
        let tokens = tokenize(".5").unwrap();
        assert_eq!(tokens, vec![Token::new(TokenKind::Number, ".5")]);
    }

    #[test]
    fn test_tokenize_operators() {
        let tokens = tokenize("+ - * / % **").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Plus, "+"),
                Token::new(TokenKind::Minus, "-"),
                Token::new(TokenKind::Star, "*"),
                Token::new(TokenKind::Slash, "/"),
                Token::new(TokenKind::Percent, "%"),
                Token::new(TokenKind::Power, "**"),
            ]
        );
    }

    #[test]
    fn test_tokenize_parens() {
        let tokens = tokenize("(1)").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::LParen, "("),
                Token::new(TokenKind::Number, "1"),
                Token::new(TokenKind::RParen, ")"),
            ]
        );
    }

    #[test]
    fn test_tokenize_expression() {
        let tokens = tokenize("2 + 3 * (4 - 1)").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Number, "2"),
                Token::new(TokenKind::Plus, "+"),
                Token::new(TokenKind::Number, "3"),
                Token::new(TokenKind::Star, "*"),
                Token::new(TokenKind::LParen, "("),
                Token::new(TokenKind::Number, "4"),
                Token::new(TokenKind::Minus, "-"),
                Token::new(TokenKind::Number, "1"),
                Token::new(TokenKind::RParen, ")"),
            ]
        );
    }

    #[test]
    fn test_tokenize_power_and_star() {
        let tokens = tokenize("2**3*4").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Number, "2"),
                Token::new(TokenKind::Power, "**"),
                Token::new(TokenKind::Number, "3"),
                Token::new(TokenKind::Star, "*"),
                Token::new(TokenKind::Number, "4"),
            ]
        );
    }

    #[test]
    fn test_tokenize_no_spaces() {
        let tokens = tokenize("1+2").unwrap();
        assert_eq!(
            tokens,
            vec![
                Token::new(TokenKind::Number, "1"),
                Token::new(TokenKind::Plus, "+"),
                Token::new(TokenKind::Number, "2"),
            ]
        );
    }

    #[test]
    fn test_tokenize_error_double_dot() {
        let err = tokenize("1.2.3").unwrap_err();
        assert!(err.contains("Unexpected character `.`"));
    }

    #[test]
    fn test_tokenize_error_unknown_char() {
        let err = tokenize("2 @ 3").unwrap_err();
        assert!(err.contains("Unexpected character `@`"));
        assert!(err.contains("position 2"));
    }

    // -- ast-types tests --

    #[test]
    fn test_ast_number_literal() {
        let node = AstNode::Number(42.0);
        assert_eq!(node, AstNode::Number(42.0));
    }

    #[test]
    fn test_ast_unary_expr() {
        let node = AstNode::Unary {
            op: "-".to_string(),
            operand: Box::new(AstNode::Number(5.0)),
        };
        match &node {
            AstNode::Unary { op, operand } => {
                assert_eq!(op, "-");
                assert_eq!(**operand, AstNode::Number(5.0));
            }
            _ => panic!("Expected Unary"),
        }
    }

    #[test]
    fn test_ast_binary_expr() {
        let node = AstNode::Binary {
            op: "+".to_string(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        match &node {
            AstNode::Binary { op, left, right } => {
                assert_eq!(op, "+");
                assert_eq!(**left, AstNode::Number(2.0));
                assert_eq!(**right, AstNode::Number(3.0));
            }
            _ => panic!("Expected Binary"),
        }
    }

    #[test]
    fn test_ast_nested() {
        let node = AstNode::Binary {
            op: "*".to_string(),
            left: Box::new(AstNode::Binary {
                op: "+".to_string(),
                left: Box::new(AstNode::Number(1.0)),
                right: Box::new(AstNode::Number(2.0)),
            }),
            right: Box::new(AstNode::Number(3.0)),
        };
        match &node {
            AstNode::Binary { op, left, .. } => {
                assert_eq!(op, "*");
                match left.as_ref() {
                    AstNode::Binary { op, .. } => assert_eq!(op, "+"),
                    _ => panic!("Expected inner Binary"),
                }
            }
            _ => panic!("Expected Binary"),
        }
    }

    // -- parser tests --

    #[test]
    fn test_parse_number() {
        let tokens = vec![Token::new(TokenKind::Number, "2")];
        let ast = parse(tokens).unwrap();
        assert_eq!(ast, AstNode::Number(2.0));
    }

    #[test]
    fn test_parse_addition() {
        let tokens = vec![
            Token::new(TokenKind::Number, "2"),
            Token::new(TokenKind::Plus, "+"),
            Token::new(TokenKind::Number, "3"),
        ];
        let ast = parse(tokens).unwrap();
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
    fn test_parse_precedence() {
        // 2 + 3 * 4 => Binary(+, 2, Binary(*, 3, 4))
        let tokens = vec![
            Token::new(TokenKind::Number, "2"),
            Token::new(TokenKind::Plus, "+"),
            Token::new(TokenKind::Number, "3"),
            Token::new(TokenKind::Star, "*"),
            Token::new(TokenKind::Number, "4"),
        ];
        let ast = parse(tokens).unwrap();
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
    fn test_parse_right_assoc_power() {
        // 2 ** 3 ** 2 => Binary(**, 2, Binary(**, 3, 2))
        let tokens = vec![
            Token::new(TokenKind::Number, "2"),
            Token::new(TokenKind::Power, "**"),
            Token::new(TokenKind::Number, "3"),
            Token::new(TokenKind::Power, "**"),
            Token::new(TokenKind::Number, "2"),
        ];
        let ast = parse(tokens).unwrap();
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
        let tokens = vec![
            Token::new(TokenKind::Minus, "-"),
            Token::new(TokenKind::Number, "5"),
        ];
        let ast = parse(tokens).unwrap();
        assert_eq!(
            ast,
            AstNode::Unary {
                op: "-".to_string(),
                operand: Box::new(AstNode::Number(5.0)),
            }
        );
    }

    #[test]
    fn test_parse_double_unary() {
        let tokens = vec![
            Token::new(TokenKind::Minus, "-"),
            Token::new(TokenKind::Minus, "-"),
            Token::new(TokenKind::Number, "5"),
        ];
        let ast = parse(tokens).unwrap();
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
    fn test_parse_parens() {
        let tokens = vec![
            Token::new(TokenKind::LParen, "("),
            Token::new(TokenKind::Number, "2"),
            Token::new(TokenKind::Plus, "+"),
            Token::new(TokenKind::Number, "3"),
            Token::new(TokenKind::RParen, ")"),
        ];
        let ast = parse(tokens).unwrap();
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
    fn test_parse_error_empty() {
        let err = parse(vec![]).unwrap_err();
        assert!(err.contains("Unexpected end of input"));
    }

    #[test]
    fn test_parse_error_trailing_op() {
        let tokens = vec![
            Token::new(TokenKind::Number, "2"),
            Token::new(TokenKind::Plus, "+"),
        ];
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("Unexpected end of input"));
    }

    #[test]
    fn test_parse_error_trailing_tokens() {
        let tokens = vec![
            Token::new(TokenKind::Number, "2"),
            Token::new(TokenKind::Number, "3"),
        ];
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("Unexpected token after expression"));
    }

    #[test]
    fn test_parse_error_missing_rparen() {
        let tokens = vec![
            Token::new(TokenKind::LParen, "("),
            Token::new(TokenKind::Number, "2"),
        ];
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("Expected rparen"));
    }

    // -- evaluator tests --

    #[test]
    fn test_eval_number() {
        assert_eq!(evaluate(&AstNode::Number(42.0)).unwrap(), 42.0);
        assert_eq!(evaluate(&AstNode::Number(3.14)).unwrap(), 3.14);
    }

    #[test]
    fn test_eval_unary() {
        let node = AstNode::Unary {
            op: "-".to_string(),
            operand: Box::new(AstNode::Number(5.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), -5.0);
    }

    #[test]
    fn test_eval_double_unary() {
        let node = AstNode::Unary {
            op: "-".to_string(),
            operand: Box::new(AstNode::Unary {
                op: "-".to_string(),
                operand: Box::new(AstNode::Number(7.0)),
            }),
        };
        assert_eq!(evaluate(&node).unwrap(), 7.0);
    }

    #[test]
    fn test_eval_binary_ops() {
        let make_bin = |op: &str, l: f64, r: f64| AstNode::Binary {
            op: op.to_string(),
            left: Box::new(AstNode::Number(l)),
            right: Box::new(AstNode::Number(r)),
        };

        assert_eq!(evaluate(&make_bin("+", 2.0, 3.0)).unwrap(), 5.0);
        assert_eq!(evaluate(&make_bin("-", 10.0, 4.0)).unwrap(), 6.0);
        assert_eq!(evaluate(&make_bin("*", 3.0, 7.0)).unwrap(), 21.0);
        assert_eq!(evaluate(&make_bin("/", 15.0, 4.0)).unwrap(), 3.75);
        assert_eq!(evaluate(&make_bin("%", 10.0, 3.0)).unwrap(), 1.0);
        assert_eq!(evaluate(&make_bin("**", 2.0, 8.0)).unwrap(), 256.0);
    }

    #[test]
    fn test_eval_nested() {
        // 2 + 3 * 4 = 14
        let node = AstNode::Binary {
            op: "+".to_string(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Binary {
                op: "*".to_string(),
                left: Box::new(AstNode::Number(3.0)),
                right: Box::new(AstNode::Number(4.0)),
            }),
        };
        assert_eq!(evaluate(&node).unwrap(), 14.0);
    }

    #[test]
    fn test_eval_division_by_zero() {
        let node = AstNode::Binary {
            op: "/".to_string(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let err = evaluate(&node).unwrap_err();
        assert!(err.contains("Division by zero"));
    }

    #[test]
    fn test_eval_modulo_by_zero() {
        let node = AstNode::Binary {
            op: "%".to_string(),
            left: Box::new(AstNode::Number(5.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let err = evaluate(&node).unwrap_err();
        assert!(err.contains("Modulo by zero"));
    }

    // -- calc (end-to-end) tests --

    #[test]
    fn test_calc_basic_ops() {
        assert_eq!(calc("1 + 2").unwrap(), 3.0);
        assert_eq!(calc("10 - 3").unwrap(), 7.0);
        assert_eq!(calc("4 * 5").unwrap(), 20.0);
        assert_eq!(calc("15 / 4").unwrap(), 3.75);
        assert_eq!(calc("10 % 3").unwrap(), 1.0);
        assert_eq!(calc("2 ** 8").unwrap(), 256.0);
    }

    #[test]
    fn test_calc_precedence() {
        assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
        assert_eq!(calc("2 * 3 + 4").unwrap(), 10.0);
        assert_eq!(calc("10 - 2 * 3").unwrap(), 4.0);
        assert_eq!(calc("2 + 3 ** 2").unwrap(), 11.0);
        assert_eq!(calc("2 * 3 ** 2").unwrap(), 18.0);
        assert_eq!(calc("2 ** 3 * 4").unwrap(), 32.0);
    }

    #[test]
    fn test_calc_parens() {
        assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
        assert_eq!(calc("2 * (3 + 4)").unwrap(), 14.0);
        assert_eq!(calc("(2 + 3) * (4 + 5)").unwrap(), 45.0);
        assert_eq!(calc("((1 + 2) * (3 + 4))").unwrap(), 21.0);
        assert_eq!(calc("(10)").unwrap(), 10.0);
    }

    #[test]
    fn test_calc_left_assoc() {
        assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
        assert_eq!(calc("1 - 2 + 3").unwrap(), 2.0);
        assert_eq!(calc("12 / 3 / 2").unwrap(), 2.0);
    }

    #[test]
    fn test_calc_right_assoc_power() {
        assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
    }

    #[test]
    fn test_calc_unary() {
        assert_eq!(calc("-5").unwrap(), -5.0);
        assert_eq!(calc("--5").unwrap(), 5.0);
        assert_eq!(calc("-(-5)").unwrap(), 5.0);
        assert_eq!(calc("2 * -3").unwrap(), -6.0);
    }

    #[test]
    fn test_calc_unary_power() {
        // -2 ** 2 = (-2) ** 2 = 4 (unary binds tighter than **)
        assert_eq!(calc("-2 ** 2").unwrap(), 4.0);
        assert_eq!(calc("-(2 ** 2)").unwrap(), -4.0);
    }

    #[test]
    fn test_calc_decimals() {
        assert_eq!(calc("3.14 * 2").unwrap(), 6.28);
        assert_eq!(calc(".5 + .5").unwrap(), 1.0);
    }

    #[test]
    fn test_calc_complex() {
        assert_eq!(calc("2 + 3 * 4 - 1").unwrap(), 13.0);
        assert_eq!(calc("(2 + 3) * (4 - 1) / 5").unwrap(), 3.0);
        assert_eq!(calc("10 % 3 + 2 ** 3").unwrap(), 9.0);
        assert_eq!(calc("2 ** (1 + 2)").unwrap(), 8.0);
        assert_eq!(calc("100 / 10 / 2 + 3").unwrap(), 8.0);
    }

    #[test]
    fn test_calc_error_empty() {
        let err = calc("").unwrap_err();
        assert!(err.contains("Empty expression"));

        let err = calc("   ").unwrap_err();
        assert!(err.contains("Empty expression"));
    }

    #[test]
    fn test_calc_error_division_by_zero() {
        let err = calc("1 / 0").unwrap_err();
        assert!(err.contains("Division by zero"));
    }

    #[test]
    fn test_calc_error_modulo_by_zero() {
        let err = calc("5 % 0").unwrap_err();
        assert!(err.contains("Modulo by zero"));
    }

    #[test]
    fn test_calc_error_unmatched_paren() {
        let err = calc("(2 + 3").unwrap_err();
        assert!(err.contains("Expected rparen"));
    }

    #[test]
    fn test_calc_error_unexpected_char() {
        let err = calc("2 @ 3").unwrap_err();
        assert!(err.contains("Unexpected character"));
    }

    #[test]
    fn test_calc_error_trailing_op() {
        let err = calc("2 +").unwrap_err();
        assert!(err.contains("Unexpected end of input"));
    }
}
