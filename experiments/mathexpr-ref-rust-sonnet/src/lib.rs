//! Math expression parser and evaluator
//!
//! This library provides a simple calculator that can parse and evaluate
//! mathematical expressions with support for basic arithmetic operations,
//! exponentiation, parentheses, and unary negation.

// ============================================================================
// Token Types
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

#[derive(Debug, Clone, PartialEq, Eq)]
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
// AST Types
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
// Tokenizer
// ============================================================================

pub fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        // Skip whitespace
        if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
            i += 1;
            continue;
        }

        // Parentheses
        if ch == '(' {
            tokens.push(token(TokenKind::LParen, "("));
            i += 1;
            continue;
        }

        if ch == ')' {
            tokens.push(token(TokenKind::RParen, ")"));
            i += 1;
            continue;
        }

        // Operators
        if ch == '+' {
            tokens.push(token(TokenKind::Plus, "+"));
            i += 1;
            continue;
        }

        if ch == '-' {
            tokens.push(token(TokenKind::Minus, "-"));
            i += 1;
            continue;
        }

        if ch == '*' {
            // Check for **
            if i + 1 < chars.len() && chars[i + 1] == '*' {
                tokens.push(token(TokenKind::Power, "**"));
                i += 2;
            } else {
                tokens.push(token(TokenKind::Star, "*"));
                i += 1;
            }
            continue;
        }

        if ch == '/' {
            tokens.push(token(TokenKind::Slash, "/"));
            i += 1;
            continue;
        }

        if ch == '%' {
            tokens.push(token(TokenKind::Percent, "%"));
            i += 1;
            continue;
        }

        // Numbers (including decimals)
        if ch.is_ascii_digit() || ch == '.' {
            let mut num = String::new();
            let mut has_dot = false;

            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                if chars[i] == '.' {
                    if has_dot {
                        return Err(format!("Unexpected character '.' at position {}", i));
                    }
                    has_dot = true;
                }
                num.push(chars[i]);
                i += 1;
            }

            tokens.push(token(TokenKind::Number, &num));
            continue;
        }

        return Err(format!("Unexpected character '{}' at position {}", ch, i));
    }

    Ok(tokens)
}

// ============================================================================
// Parser
// ============================================================================

pub fn parse(tokens: &[Token]) -> Result<AstNode, String> {
    let mut pos = 0;

    fn peek<'a>(tokens: &'a [Token], pos: usize) -> Option<&'a Token> {
        tokens.get(pos)
    }

    fn advance(pos: &mut usize) {
        *pos += 1;
    }

    fn expect<'a>(
        tokens: &'a [Token],
        pos: &mut usize,
        kind: TokenKind,
    ) -> Result<&'a Token, String> {
        let t = peek(tokens, *pos);
        match t {
            Some(token) if token.kind == kind => {
                advance(pos);
                Ok(token)
            }
            Some(token) => Err(format!("Expected {:?} but got {:?}", kind, token.kind)),
            None => Err(format!("Expected {:?} but got end of input", kind)),
        }
    }

    // Level 1: addition and subtraction (lowest precedence)
    fn parse_add_sub(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
        let mut left = parse_mul_div(tokens, pos)?;

        while let Some(t) = peek(tokens, *pos) {
            if t.kind == TokenKind::Plus || t.kind == TokenKind::Minus {
                let op_kind = t.kind;
                advance(pos);
                let op = if op_kind == TokenKind::Plus {
                    BinaryOp::Add
                } else {
                    BinaryOp::Sub
                };
                let right = parse_mul_div(tokens, pos)?;
                left = binary_expr(op, left, right);
            } else {
                break;
            }
        }

        Ok(left)
    }

    // Level 2: multiplication, division, modulo
    fn parse_mul_div(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
        let mut left = parse_power(tokens, pos)?;

        while let Some(t) = peek(tokens, *pos) {
            if t.kind == TokenKind::Star
                || t.kind == TokenKind::Slash
                || t.kind == TokenKind::Percent
            {
                let op_kind = t.kind;
                advance(pos);
                let op = match op_kind {
                    TokenKind::Star => BinaryOp::Mul,
                    TokenKind::Slash => BinaryOp::Div,
                    TokenKind::Percent => BinaryOp::Mod,
                    _ => unreachable!(),
                };
                let right = parse_power(tokens, pos)?;
                left = binary_expr(op, left, right);
            } else {
                break;
            }
        }

        Ok(left)
    }

    // Level 3: exponentiation (right-associative)
    fn parse_power(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
        let base = parse_unary(tokens, pos)?;

        if let Some(t) = peek(tokens, *pos) {
            if t.kind == TokenKind::Power {
                advance(pos);
                let exponent = parse_power(tokens, pos)?; // right-recursive
                return Ok(binary_expr(BinaryOp::Pow, base, exponent));
            }
        }

        Ok(base)
    }

    // Level 4: unary minus
    fn parse_unary(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
        if let Some(t) = peek(tokens, *pos) {
            if t.kind == TokenKind::Minus {
                advance(pos);
                let operand = parse_unary(tokens, pos)?; // allow chained unary
                return Ok(unary_expr(UnaryOp::Neg, operand));
            }
        }

        parse_atom(tokens, pos)
    }

    // Level 5: atoms — numbers and parenthesized expressions
    fn parse_atom(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
        let t = peek(tokens, *pos).ok_or("Unexpected end of input")?;

        if t.kind == TokenKind::Number {
            advance(pos);
            let value = t
                .value
                .parse::<f64>()
                .map_err(|_| format!("Invalid number: {}", t.value))?;
            return Ok(number_literal(value));
        }

        if t.kind == TokenKind::LParen {
            advance(pos);
            let expr = parse_add_sub(tokens, pos)?;
            expect(tokens, pos, TokenKind::RParen)?;
            return Ok(expr);
        }

        Err(format!("Unexpected token: {:?} '{}'", t.kind, t.value))
    }

    let ast = parse_add_sub(tokens, &mut pos)?;

    if pos < tokens.len() {
        let remaining = &tokens[pos];
        return Err(format!(
            "Unexpected token after expression: {:?} '{}'",
            remaining.kind, remaining.value
        ));
    }

    Ok(ast)
}

// ============================================================================
// Evaluator
// ============================================================================

pub fn evaluate(node: &AstNode) -> Result<f64, String> {
    match node {
        AstNode::Number(value) => Ok(*value),
        AstNode::Unary { op, operand } => {
            let val = evaluate(operand)?;
            match op {
                UnaryOp::Neg => Ok(-val),
            }
        }
        AstNode::Binary { op, left, right } => {
            let left_val = evaluate(left)?;
            let right_val = evaluate(right)?;

            match op {
                BinaryOp::Add => Ok(left_val + right_val),
                BinaryOp::Sub => Ok(left_val - right_val),
                BinaryOp::Mul => Ok(left_val * right_val),
                BinaryOp::Pow => Ok(left_val.powf(right_val)),
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
            }
        }
    }
}

// ============================================================================
// Main API
// ============================================================================

pub fn calc(expression: &str) -> Result<f64, String> {
    if expression.trim().is_empty() {
        return Err("Empty expression".to_string());
    }

    let tokens = tokenize(expression)?;
    let ast = parse(&tokens)?;
    evaluate(&ast)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // token-types tests
    // ========================================================================

    #[test]
    fn test_token_creates_token_with_kind_and_value() {
        let t = token(TokenKind::Number, "42");
        assert_eq!(t.kind, TokenKind::Number);
        assert_eq!(t.value, "42");
    }

    #[test]
    fn test_token_creates_operator_tokens() {
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

    // ========================================================================
    // ast-types tests
    // ========================================================================

    #[test]
    fn test_number_literal_creates_number_node() {
        let n = number_literal(42.0);
        assert_eq!(n, AstNode::Number(42.0));
    }

    #[test]
    fn test_unary_expr_creates_unary_node() {
        let operand = number_literal(5.0);
        let u = unary_expr(UnaryOp::Neg, operand);
        assert!(matches!(
            u,
            AstNode::Unary {
                op: UnaryOp::Neg,
                ..
            }
        ));
        if let AstNode::Unary { operand, .. } = u {
            assert_eq!(*operand, AstNode::Number(5.0));
        }
    }

    #[test]
    fn test_binary_expr_creates_binary_node() {
        let left = number_literal(2.0);
        let right = number_literal(3.0);
        let b = binary_expr(BinaryOp::Add, left, right);
        assert!(matches!(
            b,
            AstNode::Binary {
                op: BinaryOp::Add,
                ..
            }
        ));
    }

    #[test]
    fn test_nested_expressions() {
        // (2 + 3) * -4
        let inner = binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0));
        let neg = unary_expr(UnaryOp::Neg, number_literal(4.0));
        let expr = binary_expr(BinaryOp::Mul, inner, neg);

        assert!(matches!(
            expr,
            AstNode::Binary {
                op: BinaryOp::Mul,
                ..
            }
        ));
    }

    // ========================================================================
    // tokenizer tests
    // ========================================================================

    #[test]
    fn test_tokenize_empty_string() {
        assert_eq!(tokenize("").unwrap(), vec![]);
    }

    #[test]
    fn test_tokenize_whitespace_only() {
        assert_eq!(tokenize("   \t\n\r  ").unwrap(), vec![]);
    }

    #[test]
    fn test_tokenize_single_integer() {
        assert_eq!(
            tokenize("42").unwrap(),
            vec![token(TokenKind::Number, "42")]
        );
    }

    #[test]
    fn test_tokenize_decimal_number() {
        assert_eq!(
            tokenize("3.14").unwrap(),
            vec![token(TokenKind::Number, "3.14")]
        );
    }

    #[test]
    fn test_tokenize_number_starting_with_dot() {
        assert_eq!(
            tokenize(".5").unwrap(),
            vec![token(TokenKind::Number, ".5")]
        );
    }

    #[test]
    fn test_tokenize_all_operators() {
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
    fn test_tokenize_parentheses() {
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
    fn test_tokenize_complex_expression() {
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
    fn test_tokenize_power_operator_distinguished_from_multiply() {
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
    fn test_tokenize_no_whitespace() {
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
    fn test_tokenize_multiple_decimals_throws() {
        let result = tokenize("1.2.3");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected character '.'"));
    }

    #[test]
    fn test_tokenize_unrecognized_character_throws() {
        let result = tokenize("2 @ 3");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected character '@'"));
    }

    #[test]
    fn test_tokenize_unrecognized_character_reports_position() {
        let result = tokenize("2 @ 3");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("position 2"));
    }

    // ========================================================================
    // parser tests
    // ========================================================================

    fn p(input: &str) -> AstNode {
        let tokens = tokenize(input).unwrap();
        parse(&tokens).unwrap()
    }

    #[test]
    fn test_parse_single_number() {
        assert_eq!(p("42"), number_literal(42.0));
    }

    #[test]
    fn test_parse_decimal_number() {
        assert_eq!(p("3.14"), number_literal(3.14));
    }

    #[test]
    fn test_parse_parenthesized_number() {
        assert_eq!(p("(42)"), number_literal(42.0));
    }

    #[test]
    fn test_parse_nested_parentheses() {
        assert_eq!(p("((7))"), number_literal(7.0));
    }

    #[test]
    fn test_parse_addition() {
        let result = p("2 + 3");
        assert_eq!(
            result,
            binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0))
        );
    }

    #[test]
    fn test_parse_subtraction() {
        assert_eq!(
            p("5 - 1"),
            binary_expr(BinaryOp::Sub, number_literal(5.0), number_literal(1.0))
        );
    }

    #[test]
    fn test_parse_multiplication() {
        assert_eq!(
            p("4 * 6"),
            binary_expr(BinaryOp::Mul, number_literal(4.0), number_literal(6.0))
        );
    }

    #[test]
    fn test_parse_division() {
        assert_eq!(
            p("10 / 2"),
            binary_expr(BinaryOp::Div, number_literal(10.0), number_literal(2.0))
        );
    }

    #[test]
    fn test_parse_modulo() {
        assert_eq!(
            p("10 % 3"),
            binary_expr(BinaryOp::Mod, number_literal(10.0), number_literal(3.0))
        );
    }

    #[test]
    fn test_parse_power() {
        assert_eq!(
            p("2 ** 3"),
            binary_expr(BinaryOp::Pow, number_literal(2.0), number_literal(3.0))
        );
    }

    #[test]
    fn test_parse_multiply_before_add() {
        // 2 + 3 * 4 → 2 + (3 * 4)
        let ast = p("2 + 3 * 4");
        assert_eq!(
            ast,
            binary_expr(
                BinaryOp::Add,
                number_literal(2.0),
                binary_expr(BinaryOp::Mul, number_literal(3.0), number_literal(4.0))
            )
        );
    }

    #[test]
    fn test_parse_power_before_multiply() {
        // 2 * 3 ** 2 → 2 * (3 ** 2)
        let ast = p("2 * 3 ** 2");
        assert_eq!(
            ast,
            binary_expr(
                BinaryOp::Mul,
                number_literal(2.0),
                binary_expr(BinaryOp::Pow, number_literal(3.0), number_literal(2.0))
            )
        );
    }

    #[test]
    fn test_parse_parens_override_precedence() {
        // (2 + 3) * 4
        let ast = p("(2 + 3) * 4");
        assert_eq!(
            ast,
            binary_expr(
                BinaryOp::Mul,
                binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0)),
                number_literal(4.0)
            )
        );
    }

    #[test]
    fn test_parse_left_associative_add() {
        // 1 - 2 - 3 → (1 - 2) - 3
        let ast = p("1 - 2 - 3");
        assert_eq!(
            ast,
            binary_expr(
                BinaryOp::Sub,
                binary_expr(BinaryOp::Sub, number_literal(1.0), number_literal(2.0)),
                number_literal(3.0)
            )
        );
    }

    #[test]
    fn test_parse_left_associative_multiply() {
        // 12 / 3 / 2 → (12 / 3) / 2
        let ast = p("12 / 3 / 2");
        assert_eq!(
            ast,
            binary_expr(
                BinaryOp::Div,
                binary_expr(BinaryOp::Div, number_literal(12.0), number_literal(3.0)),
                number_literal(2.0)
            )
        );
    }

    #[test]
    fn test_parse_right_associative_power() {
        // 2 ** 3 ** 2 → 2 ** (3 ** 2)
        let ast = p("2 ** 3 ** 2");
        assert_eq!(
            ast,
            binary_expr(
                BinaryOp::Pow,
                number_literal(2.0),
                binary_expr(BinaryOp::Pow, number_literal(3.0), number_literal(2.0))
            )
        );
    }

    #[test]
    fn test_parse_unary_minus() {
        assert_eq!(p("-5"), unary_expr(UnaryOp::Neg, number_literal(5.0)));
    }

    #[test]
    fn test_parse_double_unary_minus() {
        assert_eq!(
            p("--5"),
            unary_expr(
                UnaryOp::Neg,
                unary_expr(UnaryOp::Neg, number_literal(5.0))
            )
        );
    }

    #[test]
    fn test_parse_unary_in_expression() {
        // 2 * -3
        assert_eq!(
            p("2 * -3"),
            binary_expr(
                BinaryOp::Mul,
                number_literal(2.0),
                unary_expr(UnaryOp::Neg, number_literal(3.0))
            )
        );
    }

    #[test]
    fn test_parse_empty_token_list() {
        let result = parse(&[]);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected end of input"));
    }

    #[test]
    fn test_parse_unmatched_left_paren() {
        let result = tokenize("(2 + 3").and_then(|t| parse(&t));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Expected"));
    }

    #[test]
    fn test_parse_unmatched_right_paren() {
        let result = tokenize("2 + 3)").and_then(|t| parse(&t));
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Unexpected token after expression"));
    }

    #[test]
    fn test_parse_unexpected_operator_at_start() {
        let result = tokenize("* 5").and_then(|t| parse(&t));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected token"));
    }

    #[test]
    fn test_parse_trailing_operator() {
        let result = tokenize("2 +").and_then(|t| parse(&t));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected end of input"));
    }

    // ========================================================================
    // evaluator tests
    // ========================================================================

    #[test]
    fn test_evaluate_number_literal() {
        assert_eq!(evaluate(&number_literal(42.0)).unwrap(), 42.0);
    }

    #[test]
    fn test_evaluate_unary_negation() {
        assert_eq!(
            evaluate(&unary_expr(UnaryOp::Neg, number_literal(5.0))).unwrap(),
            -5.0
        );
    }

    #[test]
    fn test_evaluate_addition() {
        assert_eq!(
            evaluate(&binary_expr(
                BinaryOp::Add,
                number_literal(2.0),
                number_literal(3.0)
            ))
            .unwrap(),
            5.0
        );
    }

    #[test]
    fn test_evaluate_subtraction() {
        assert_eq!(
            evaluate(&binary_expr(
                BinaryOp::Sub,
                number_literal(10.0),
                number_literal(4.0)
            ))
            .unwrap(),
            6.0
        );
    }

    #[test]
    fn test_evaluate_multiplication() {
        assert_eq!(
            evaluate(&binary_expr(
                BinaryOp::Mul,
                number_literal(3.0),
                number_literal(7.0)
            ))
            .unwrap(),
            21.0
        );
    }

    #[test]
    fn test_evaluate_division() {
        assert_eq!(
            evaluate(&binary_expr(
                BinaryOp::Div,
                number_literal(10.0),
                number_literal(4.0)
            ))
            .unwrap(),
            2.5
        );
    }

    #[test]
    fn test_evaluate_modulo() {
        assert_eq!(
            evaluate(&binary_expr(
                BinaryOp::Mod,
                number_literal(10.0),
                number_literal(3.0)
            ))
            .unwrap(),
            1.0
        );
    }

    #[test]
    fn test_evaluate_power() {
        assert_eq!(
            evaluate(&binary_expr(
                BinaryOp::Pow,
                number_literal(2.0),
                number_literal(10.0)
            ))
            .unwrap(),
            1024.0
        );
    }

    #[test]
    fn test_evaluate_division_by_zero_throws() {
        let result = evaluate(&binary_expr(
            BinaryOp::Div,
            number_literal(1.0),
            number_literal(0.0),
        ));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Division by zero"));
    }

    #[test]
    fn test_evaluate_modulo_by_zero_throws() {
        let result = evaluate(&binary_expr(
            BinaryOp::Mod,
            number_literal(1.0),
            number_literal(0.0),
        ));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Modulo by zero"));
    }

    #[test]
    fn test_evaluate_nested_expression() {
        // (2 + 3) * -4 = -20
        let expr = binary_expr(
            BinaryOp::Mul,
            binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0)),
            unary_expr(UnaryOp::Neg, number_literal(4.0)),
        );
        assert_eq!(evaluate(&expr).unwrap(), -20.0);
    }

    // ========================================================================
    // calc (end-to-end) tests
    // ========================================================================

    #[test]
    fn test_calc_basic_addition() {
        assert_eq!(calc("1 + 2").unwrap(), 3.0);
    }

    #[test]
    fn test_calc_basic_subtraction() {
        assert_eq!(calc("10 - 3").unwrap(), 7.0);
    }

    #[test]
    fn test_calc_basic_multiplication() {
        assert_eq!(calc("4 * 5").unwrap(), 20.0);
    }

    #[test]
    fn test_calc_basic_division() {
        assert_eq!(calc("15 / 4").unwrap(), 3.75);
    }

    #[test]
    fn test_calc_basic_modulo() {
        assert_eq!(calc("10 % 3").unwrap(), 1.0);
    }

    #[test]
    fn test_calc_basic_power() {
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
    fn test_calc_precedence_add_pow() {
        assert_eq!(calc("2 + 3 ** 2").unwrap(), 11.0);
    }

    #[test]
    fn test_calc_precedence_mul_pow() {
        assert_eq!(calc("2 * 3 ** 2").unwrap(), 18.0);
    }

    #[test]
    fn test_calc_precedence_pow_mul() {
        assert_eq!(calc("2 ** 3 * 4").unwrap(), 32.0);
    }

    #[test]
    fn test_calc_parentheses_override_1() {
        assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
    }

    #[test]
    fn test_calc_parentheses_override_2() {
        assert_eq!(calc("2 * (3 + 4)").unwrap(), 14.0);
    }

    #[test]
    fn test_calc_parentheses_override_3() {
        assert_eq!(calc("(2 + 3) * (4 + 5)").unwrap(), 45.0);
    }

    #[test]
    fn test_calc_parentheses_override_4() {
        assert_eq!(calc("((1 + 2) * (3 + 4))").unwrap(), 21.0);
    }

    #[test]
    fn test_calc_parentheses_single_number() {
        assert_eq!(calc("(10)").unwrap(), 10.0);
    }

    #[test]
    fn test_calc_associativity_left_sub() {
        assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
    }

    #[test]
    fn test_calc_associativity_left_add_sub() {
        assert_eq!(calc("1 - 2 + 3").unwrap(), 2.0);
    }

    #[test]
    fn test_calc_associativity_left_div() {
        assert_eq!(calc("12 / 3 / 2").unwrap(), 2.0);
    }

    #[test]
    fn test_calc_associativity_right_pow() {
        assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
    }

    #[test]
    fn test_calc_unary_minus_simple() {
        assert_eq!(calc("-5").unwrap(), -5.0);
    }

    #[test]
    fn test_calc_unary_minus_double() {
        assert_eq!(calc("--5").unwrap(), 5.0);
    }

    #[test]
    fn test_calc_unary_minus_in_parens() {
        assert_eq!(calc("-(-5)").unwrap(), 5.0);
    }

    #[test]
    fn test_calc_unary_minus_in_expression() {
        assert_eq!(calc("2 * -3").unwrap(), -6.0);
    }

    #[test]
    fn test_calc_unary_minus_with_power_1() {
        // -2 ** 2 = -(2 ** 2) = -4 in JavaScript
        // But in the tests, it expects 4.0, which suggests the unary applies first
        // Looking at the TypeScript parser: unary is level 4, power is level 3
        // So power binds tighter than unary? No, unary is parsed at a higher level
        // Actually, parseUnary calls parsePower, so unary is LOWER precedence
        // Wait, let me re-read: parsePower calls parseUnary, so unary is HIGHER precedence
        // So -2 ** 2 should parse as (-2) ** 2 = 4
        assert_eq!(calc("-2 ** 2").unwrap(), 4.0);
    }

    #[test]
    fn test_calc_unary_minus_with_power_2() {
        assert_eq!(calc("-(2 ** 2)").unwrap(), -4.0);
    }

    #[test]
    fn test_calc_decimal_addition() {
        assert_eq!(calc("0.1 + 0.2").unwrap(), 0.1 + 0.2);
    }

    #[test]
    fn test_calc_decimal_multiplication() {
        assert_eq!(calc("3.14 * 2").unwrap(), 6.28);
    }

    #[test]
    fn test_calc_decimal_dot_notation() {
        assert_eq!(calc(".5 + .5").unwrap(), 1.0);
    }

    #[test]
    fn test_calc_complex_expression_1() {
        assert_eq!(calc("2 + 3 * 4 - 1").unwrap(), 13.0);
    }

    #[test]
    fn test_calc_complex_expression_2() {
        assert_eq!(calc("(2 + 3) * (4 - 1) / 5").unwrap(), 3.0);
    }

    #[test]
    fn test_calc_complex_expression_3() {
        assert_eq!(calc("10 % 3 + 2 ** 3").unwrap(), 9.0);
    }

    #[test]
    fn test_calc_complex_expression_4() {
        assert_eq!(calc("2 ** (1 + 2)").unwrap(), 8.0);
    }

    #[test]
    fn test_calc_complex_expression_5() {
        assert_eq!(calc("100 / 10 / 2 + 3").unwrap(), 8.0);
    }

    #[test]
    fn test_calc_error_empty_expression() {
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
    fn test_calc_error_division_by_zero() {
        let result = calc("1 / 0");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Division by zero"));
    }

    #[test]
    fn test_calc_error_modulo_by_zero() {
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
    fn test_calc_error_invalid_character() {
        let result = calc("2 @ 3");
        assert!(result.is_err());
    }

    #[test]
    fn test_calc_error_trailing_operator() {
        let result = calc("2 +");
        assert!(result.is_err());
    }
}
