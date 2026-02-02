// mathexpr: A math expression parser and evaluator.
// Pipeline: tokenize -> parse -> evaluate

// ─── Types ───────────────────────────────────────────────────────────────────

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

#[derive(Debug, Clone, PartialEq)]
pub enum AstNode {
    Number(f64),
    Unary { op: String, operand: Box<AstNode> },
    Binary { op: String, left: Box<AstNode>, right: Box<AstNode> },
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

pub fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let chars: Vec<char> = input.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        if ch.is_whitespace() {
            i += 1;
            continue;
        }

        if ch.is_ascii_digit() || ch == '.' {
            let start = i;
            let mut has_dot = false;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                if chars[i] == '.' {
                    if has_dot {
                        return Err("Unexpected character `.`".to_string());
                    }
                    has_dot = true;
                }
                i += 1;
            }
            let value: String = chars[start..i].iter().collect();
            tokens.push(Token { kind: TokenKind::Number, value });
            continue;
        }

        match ch {
            '+' => {
                tokens.push(Token { kind: TokenKind::Plus, value: "+".into() });
                i += 1;
            }
            '-' => {
                tokens.push(Token { kind: TokenKind::Minus, value: "-".into() });
                i += 1;
            }
            '*' => {
                if i + 1 < chars.len() && chars[i + 1] == '*' {
                    tokens.push(Token { kind: TokenKind::Power, value: "**".into() });
                    i += 2;
                } else {
                    tokens.push(Token { kind: TokenKind::Star, value: "*".into() });
                    i += 1;
                }
            }
            '/' => {
                tokens.push(Token { kind: TokenKind::Slash, value: "/".into() });
                i += 1;
            }
            '%' => {
                tokens.push(Token { kind: TokenKind::Percent, value: "%".into() });
                i += 1;
            }
            '(' => {
                tokens.push(Token { kind: TokenKind::LParen, value: "(".into() });
                i += 1;
            }
            ')' => {
                tokens.push(Token { kind: TokenKind::RParen, value: ")".into() });
                i += 1;
            }
            _ => {
                return Err(format!("Unexpected character `{}` at position {}", ch, i));
            }
        }
    }

    Ok(tokens)
}

// ─── Parser ──────────────────────────────────────────────────────────────────

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

    fn advance(&mut self) -> Token {
        let tok = self.tokens[self.pos].clone();
        self.pos += 1;
        tok
    }

    fn expect(&mut self, kind: TokenKind) -> Result<Token, String> {
        match self.peek() {
            Some(tok) if tok.kind == kind => Ok(self.advance()),
            Some(_tok) => Err(format!("Expected {:?}", kind)),
            None => Err("Unexpected end of input".into()),
        }
    }

    // Level 1: + and - (left-associative)
    fn parse_addition(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_multiplication()?;
        while let Some(tok) = self.peek() {
            match tok.kind {
                TokenKind::Plus | TokenKind::Minus => {
                    let op_tok = self.advance();
                    let right = self.parse_multiplication()?;
                    left = AstNode::Binary {
                        op: op_tok.value,
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
    fn parse_multiplication(&mut self) -> Result<AstNode, String> {
        let mut left = self.parse_power()?;
        while let Some(tok) = self.peek() {
            match tok.kind {
                TokenKind::Star | TokenKind::Slash | TokenKind::Percent => {
                    let op_tok = self.advance();
                    let right = self.parse_power()?;
                    left = AstNode::Binary {
                        op: op_tok.value,
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
                let op_tok = self.advance();
                let exp = self.parse_power()?; // right-recursive for right-associativity
                return Ok(AstNode::Binary {
                    op: op_tok.value,
                    left: Box::new(base),
                    right: Box::new(exp),
                });
            }
        }
        Ok(base)
    }

    // Level 4: unary - (prefix, right-associative, can chain)
    fn parse_unary(&mut self) -> Result<AstNode, String> {
        if let Some(tok) = self.peek() {
            if tok.kind == TokenKind::Minus {
                self.advance();
                let operand = self.parse_unary()?;
                return Ok(AstNode::Unary {
                    op: "-".into(),
                    operand: Box::new(operand),
                });
            }
        }
        self.parse_atom()
    }

    // Level 5: numbers and parenthesized expressions
    fn parse_atom(&mut self) -> Result<AstNode, String> {
        match self.peek() {
            Some(tok) => match tok.kind {
                TokenKind::Number => {
                    let tok = self.advance();
                    let val: f64 = tok.value.parse().map_err(|_| "Invalid number".to_string())?;
                    Ok(AstNode::Number(val))
                }
                TokenKind::LParen => {
                    self.advance(); // consume (
                    let expr = self.parse_addition()?;
                    self.expect(TokenKind::RParen).map_err(|_| "Expected rparen".to_string())?;
                    Ok(expr)
                }
                _ => {
                    let kind = format!("{:?}", tok.kind).to_lowercase();
                    Err(format!("Unexpected token: {}", kind))
                }
            },
            None => Err("Unexpected end of input".into()),
        }
    }
}

pub fn parse(tokens: Vec<Token>) -> Result<AstNode, String> {
    if tokens.is_empty() {
        return Err("Unexpected end of input".into());
    }
    let mut parser = Parser::new(tokens);
    let ast = parser.parse_addition()?;
    if parser.pos < parser.tokens.len() {
        return Err("Unexpected token after expression".into());
    }
    Ok(ast)
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

pub fn evaluate(node: &AstNode) -> Result<f64, String> {
    match node {
        AstNode::Number(val) => Ok(*val),
        AstNode::Unary { op, operand } => {
            let val = evaluate(operand)?;
            match op.as_str() {
                "-" => Ok(-val),
                _ => Err(format!("Unknown unary operator: {}", op)),
            }
        }
        AstNode::Binary { op, left, right } => {
            let l = evaluate(left)?;
            let r = evaluate(right)?;
            match op.as_str() {
                "+" => Ok(l + r),
                "-" => Ok(l - r),
                "*" => Ok(l * r),
                "/" => {
                    if r == 0.0 {
                        Err("Division by zero".into())
                    } else {
                        Ok(l / r)
                    }
                }
                "%" => {
                    if r == 0.0 {
                        Err("Modulo by zero".into())
                    } else {
                        Ok(l % r)
                    }
                }
                "**" => Ok(l.powf(r)),
                _ => Err(format!("Unknown operator: {}", op)),
            }
        }
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

pub fn calc(expression: &str) -> Result<f64, String> {
    if expression.trim().is_empty() {
        return Err("Empty expression".into());
    }
    let tokens = tokenize(expression)?;
    let ast = parse(tokens)?;
    evaluate(&ast)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to build token lists concisely
    fn tok(kind: TokenKind, value: &str) -> Token {
        Token { kind, value: value.into() }
    }

    // ── Tokenizer tests ──────────────────────────────────────────────────

    #[test]
    fn tokenize_empty() {
        assert_eq!(tokenize("").unwrap(), vec![]);
    }

    #[test]
    fn tokenize_whitespace_only() {
        assert_eq!(tokenize("   \t\n  ").unwrap(), vec![]);
    }

    #[test]
    fn tokenize_integer() {
        assert_eq!(tokenize("42").unwrap(), vec![tok(TokenKind::Number, "42")]);
    }

    #[test]
    fn tokenize_decimal() {
        assert_eq!(tokenize("3.14").unwrap(), vec![tok(TokenKind::Number, "3.14")]);
    }

    #[test]
    fn tokenize_leading_dot() {
        assert_eq!(tokenize(".5").unwrap(), vec![tok(TokenKind::Number, ".5")]);
    }

    #[test]
    fn tokenize_operators() {
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
    fn tokenize_parens() {
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
    fn tokenize_expression() {
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
    fn tokenize_power_and_star() {
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
    fn tokenize_no_spaces() {
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
    fn tokenize_error_double_dot() {
        let err = tokenize("1.2.3").unwrap_err();
        assert!(err.contains("Unexpected character `.`"), "got: {}", err);
    }

    #[test]
    fn tokenize_error_invalid_char() {
        let err = tokenize("2 @ 3").unwrap_err();
        assert!(err.contains("@"), "got: {}", err);
        assert!(err.contains("2"), "got: {}", err);
    }

    // ── Parser tests ─────────────────────────────────────────────────────

    #[test]
    fn parse_number() {
        let tokens = tokenize("42").unwrap();
        assert_eq!(parse(tokens).unwrap(), AstNode::Number(42.0));
    }

    #[test]
    fn parse_decimal() {
        let tokens = tokenize("3.14").unwrap();
        assert_eq!(parse(tokens).unwrap(), AstNode::Number(3.14));
    }

    #[test]
    fn parse_parens() {
        let tokens = tokenize("(42)").unwrap();
        assert_eq!(parse(tokens).unwrap(), AstNode::Number(42.0));
    }

    #[test]
    fn parse_double_parens() {
        let tokens = tokenize("((7))").unwrap();
        assert_eq!(parse(tokens).unwrap(), AstNode::Number(7.0));
    }

    #[test]
    fn parse_addition() {
        let tokens = tokenize("2 + 3").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "+".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn parse_subtraction() {
        let tokens = tokenize("5 - 1").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "-".into(),
                left: Box::new(AstNode::Number(5.0)),
                right: Box::new(AstNode::Number(1.0)),
            }
        );
    }

    #[test]
    fn parse_multiplication() {
        let tokens = tokenize("4 * 6").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "*".into(),
                left: Box::new(AstNode::Number(4.0)),
                right: Box::new(AstNode::Number(6.0)),
            }
        );
    }

    #[test]
    fn parse_division() {
        let tokens = tokenize("10 / 2").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "/".into(),
                left: Box::new(AstNode::Number(10.0)),
                right: Box::new(AstNode::Number(2.0)),
            }
        );
    }

    #[test]
    fn parse_modulo() {
        let tokens = tokenize("10 % 3").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "%".into(),
                left: Box::new(AstNode::Number(10.0)),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn parse_power() {
        let tokens = tokenize("2 ** 3").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "**".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    // Precedence tests
    #[test]
    fn parse_precedence_add_mul() {
        let tokens = tokenize("2 + 3 * 4").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "+".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Binary {
                    op: "*".into(),
                    left: Box::new(AstNode::Number(3.0)),
                    right: Box::new(AstNode::Number(4.0)),
                }),
            }
        );
    }

    #[test]
    fn parse_precedence_mul_power() {
        let tokens = tokenize("2 * 3 ** 2").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "*".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Binary {
                    op: "**".into(),
                    left: Box::new(AstNode::Number(3.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }),
            }
        );
    }

    #[test]
    fn parse_precedence_parens() {
        let tokens = tokenize("(2 + 3) * 4").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "*".into(),
                left: Box::new(AstNode::Binary {
                    op: "+".into(),
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }),
                right: Box::new(AstNode::Number(4.0)),
            }
        );
    }

    // Associativity tests
    #[test]
    fn parse_left_assoc_sub() {
        let tokens = tokenize("1 - 2 - 3").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "-".into(),
                left: Box::new(AstNode::Binary {
                    op: "-".into(),
                    left: Box::new(AstNode::Number(1.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }),
                right: Box::new(AstNode::Number(3.0)),
            }
        );
    }

    #[test]
    fn parse_left_assoc_div() {
        let tokens = tokenize("12 / 3 / 2").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "/".into(),
                left: Box::new(AstNode::Binary {
                    op: "/".into(),
                    left: Box::new(AstNode::Number(12.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }),
                right: Box::new(AstNode::Number(2.0)),
            }
        );
    }

    #[test]
    fn parse_right_assoc_power() {
        let tokens = tokenize("2 ** 3 ** 2").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "**".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Binary {
                    op: "**".into(),
                    left: Box::new(AstNode::Number(3.0)),
                    right: Box::new(AstNode::Number(2.0)),
                }),
            }
        );
    }

    // Unary tests
    #[test]
    fn parse_unary_minus() {
        let tokens = tokenize("-5").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Unary {
                op: "-".into(),
                operand: Box::new(AstNode::Number(5.0)),
            }
        );
    }

    #[test]
    fn parse_double_unary() {
        let tokens = tokenize("--5").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Unary {
                op: "-".into(),
                operand: Box::new(AstNode::Unary {
                    op: "-".into(),
                    operand: Box::new(AstNode::Number(5.0)),
                }),
            }
        );
    }

    #[test]
    fn parse_binary_with_unary() {
        let tokens = tokenize("2 * -3").unwrap();
        assert_eq!(
            parse(tokens).unwrap(),
            AstNode::Binary {
                op: "*".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Unary {
                    op: "-".into(),
                    operand: Box::new(AstNode::Number(3.0)),
                }),
            }
        );
    }

    // Parser error tests
    #[test]
    fn parse_error_empty() {
        let err = parse(vec![]).unwrap_err();
        assert!(err.contains("Unexpected end of input"), "got: {}", err);
    }

    #[test]
    fn parse_error_unmatched_lparen() {
        let tokens = tokenize("(2 + 3").unwrap();
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("rparen"), "got: {}", err);
    }

    #[test]
    fn parse_error_trailing_rparen() {
        let tokens = tokenize("2 + 3)").unwrap();
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("Unexpected token after expression"), "got: {}", err);
    }

    #[test]
    fn parse_error_leading_star() {
        let tokens = tokenize("* 5").unwrap();
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("Unexpected token"), "got: {}", err);
        assert!(err.contains("star"), "got: {}", err);
    }

    #[test]
    fn parse_error_trailing_op() {
        let tokens = tokenize("2 +").unwrap();
        let err = parse(tokens).unwrap_err();
        assert!(err.contains("Unexpected end of input"), "got: {}", err);
    }

    // ── Evaluator tests ──────────────────────────────────────────────────

    #[test]
    fn eval_number() {
        assert_eq!(evaluate(&AstNode::Number(42.0)).unwrap(), 42.0);
    }

    #[test]
    fn eval_unary_minus() {
        let node = AstNode::Unary {
            op: "-".into(),
            operand: Box::new(AstNode::Number(5.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), -5.0);
    }

    #[test]
    fn eval_add() {
        let node = AstNode::Binary {
            op: "+".into(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), 5.0);
    }

    #[test]
    fn eval_sub() {
        let node = AstNode::Binary {
            op: "-".into(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(4.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), 6.0);
    }

    #[test]
    fn eval_mul() {
        let node = AstNode::Binary {
            op: "*".into(),
            left: Box::new(AstNode::Number(3.0)),
            right: Box::new(AstNode::Number(7.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), 21.0);
    }

    #[test]
    fn eval_div() {
        let node = AstNode::Binary {
            op: "/".into(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(4.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), 2.5);
    }

    #[test]
    fn eval_modulo() {
        let node = AstNode::Binary {
            op: "%".into(),
            left: Box::new(AstNode::Number(10.0)),
            right: Box::new(AstNode::Number(3.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), 1.0);
    }

    #[test]
    fn eval_power() {
        let node = AstNode::Binary {
            op: "**".into(),
            left: Box::new(AstNode::Number(2.0)),
            right: Box::new(AstNode::Number(10.0)),
        };
        assert_eq!(evaluate(&node).unwrap(), 1024.0);
    }

    #[test]
    fn eval_div_by_zero() {
        let node = AstNode::Binary {
            op: "/".into(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let err = evaluate(&node).unwrap_err();
        assert!(err.contains("Division by zero"), "got: {}", err);
    }

    #[test]
    fn eval_mod_by_zero() {
        let node = AstNode::Binary {
            op: "%".into(),
            left: Box::new(AstNode::Number(1.0)),
            right: Box::new(AstNode::Number(0.0)),
        };
        let err = evaluate(&node).unwrap_err();
        assert!(err.contains("Modulo by zero"), "got: {}", err);
    }

    #[test]
    fn eval_nested() {
        // (2 + 3) * (-(4)) = 5 * -4 = -20
        let node = AstNode::Binary {
            op: "*".into(),
            left: Box::new(AstNode::Binary {
                op: "+".into(),
                left: Box::new(AstNode::Number(2.0)),
                right: Box::new(AstNode::Number(3.0)),
            }),
            right: Box::new(AstNode::Unary {
                op: "-".into(),
                operand: Box::new(AstNode::Number(4.0)),
            }),
        };
        assert_eq!(evaluate(&node).unwrap(), -20.0);
    }

    // ── End-to-end (calc) tests ──────────────────────────────────────────

    fn assert_calc(expr: &str, expected: f64) {
        let result = calc(expr).unwrap();
        assert!(
            (result - expected).abs() < 1e-9,
            "calc(\"{}\") = {}, expected {}",
            expr,
            result,
            expected
        );
    }

    #[test]
    fn calc_basic_ops() {
        assert_calc("1 + 2", 3.0);
        assert_calc("10 - 3", 7.0);
        assert_calc("4 * 5", 20.0);
        assert_calc("15 / 4", 3.75);
        assert_calc("10 % 3", 1.0);
        assert_calc("2 ** 8", 256.0);
    }

    #[test]
    fn calc_precedence() {
        assert_calc("2 + 3 * 4", 14.0);
        assert_calc("2 * 3 + 4", 10.0);
        assert_calc("10 - 2 * 3", 4.0);
        assert_calc("2 + 3 ** 2", 11.0);
        assert_calc("2 * 3 ** 2", 18.0);
        assert_calc("2 ** 3 * 4", 32.0);
    }

    #[test]
    fn calc_parens() {
        assert_calc("(2 + 3) * 4", 20.0);
        assert_calc("2 * (3 + 4)", 14.0);
        assert_calc("(2 + 3) * (4 + 5)", 45.0);
        assert_calc("((1 + 2) * (3 + 4))", 21.0);
        assert_calc("(10)", 10.0);
    }

    #[test]
    fn calc_associativity() {
        assert_calc("1 - 2 - 3", -4.0);
        assert_calc("1 - 2 + 3", 2.0);
        assert_calc("12 / 3 / 2", 2.0);
        assert_calc("2 ** 3 ** 2", 512.0);
    }

    #[test]
    fn calc_unary() {
        assert_calc("-5", -5.0);
        assert_calc("--5", 5.0);
        assert_calc("-(-5)", 5.0);
        assert_calc("2 * -3", -6.0);
        assert_calc("-2 ** 2", 4.0);
        assert_calc("-(2 ** 2)", -4.0);
    }

    #[test]
    fn calc_decimals() {
        assert_calc("3.14 * 2", 6.28);
        assert_calc(".5 + .5", 1.0);
    }

    #[test]
    fn calc_complex() {
        assert_calc("2 + 3 * 4 - 1", 13.0);
        assert_calc("(2 + 3) * (4 - 1) / 5", 3.0);
        assert_calc("10 % 3 + 2 ** 3", 9.0);
        assert_calc("2 ** (1 + 2)", 8.0);
        assert_calc("100 / 10 / 2 + 3", 8.0);
    }

    #[test]
    fn calc_error_empty() {
        let err = calc("").unwrap_err();
        assert!(err.contains("Empty expression"), "got: {}", err);
    }

    #[test]
    fn calc_error_whitespace() {
        let err = calc("   ").unwrap_err();
        assert!(err.contains("Empty expression"), "got: {}", err);
    }

    #[test]
    fn calc_error_div_zero() {
        let err = calc("1 / 0").unwrap_err();
        assert!(err.contains("Division by zero"), "got: {}", err);
    }

    #[test]
    fn calc_error_mod_zero() {
        let err = calc("5 % 0").unwrap_err();
        assert!(err.contains("Modulo by zero"), "got: {}", err);
    }

    #[test]
    fn calc_error_unmatched_paren() {
        let err = calc("(2 + 3").unwrap_err();
        assert!(err.contains("rparen") || err.contains("paren"), "got: {}", err);
    }

    #[test]
    fn calc_error_invalid_char() {
        let err = calc("2 @ 3").unwrap_err();
        assert!(err.contains("@"), "got: {}", err);
    }

    #[test]
    fn calc_error_trailing_op() {
        let err = calc("2 +").unwrap_err();
        assert!(err.contains("end"), "got: {}", err);
    }
}
