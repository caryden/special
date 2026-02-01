// mathexpr — A math expression parser/evaluator translated from a Type-O reference.
//
// Pipeline: tokenize -> parse -> evaluate
// Public API: calc(&str) -> Result<f64, String>

use std::fmt;

// ── Token types ──────────────────────────────────────────────────────────────

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

impl fmt::Display for TokenKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            TokenKind::Number => "number",
            TokenKind::Plus => "plus",
            TokenKind::Minus => "minus",
            TokenKind::Star => "star",
            TokenKind::Slash => "slash",
            TokenKind::Percent => "percent",
            TokenKind::Power => "power",
            TokenKind::LParen => "lparen",
            TokenKind::RParen => "rparen",
        };
        write!(f, "{}", s)
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

// ── AST types ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum BinaryOp {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Pow,
}

impl fmt::Display for BinaryOp {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            BinaryOp::Add => "+",
            BinaryOp::Sub => "-",
            BinaryOp::Mul => "*",
            BinaryOp::Div => "/",
            BinaryOp::Mod => "%",
            BinaryOp::Pow => "**",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone, PartialEq)]
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

pub fn unary_expr(operand: AstNode) -> AstNode {
    AstNode::Unary {
        op: UnaryOp::Neg,
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

// ── Tokenizer ────────────────────────────────────────────────────────────────

pub fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let chars: Vec<char> = input.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        if ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
            i += 1;
            continue;
        }

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

// ── Parser ───────────────────────────────────────────────────────────────────

pub fn parse(tokens: &[Token]) -> Result<AstNode, String> {
    let mut pos = 0;
    let ast = parse_add_sub(tokens, &mut pos)?;

    if pos < tokens.len() {
        let remaining = &tokens[pos];
        return Err(format!(
            "Unexpected token after expression: {} '{}'",
            remaining.kind, remaining.value
        ));
    }

    Ok(ast)
}

fn peek<'a>(tokens: &'a [Token], pos: &usize) -> Option<&'a Token> {
    tokens.get(*pos)
}

fn advance<'a>(tokens: &'a [Token], pos: &mut usize) -> &'a Token {
    let t = &tokens[*pos];
    *pos += 1;
    t
}

fn expect<'a>(tokens: &'a [Token], pos: &mut usize, kind: TokenKind) -> Result<&'a Token, String> {
    match peek(tokens, pos) {
        Some(t) if t.kind == kind => Ok(advance(tokens, pos)),
        Some(t) => Err(format!("Expected {} but got {}", kind, t.kind)),
        None => Err(format!("Expected {} but got end of input", kind)),
    }
}

// Level 1: addition and subtraction (lowest precedence)
fn parse_add_sub(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
    let mut left = parse_mul_div(tokens, pos)?;
    while let Some(t) = peek(tokens, pos) {
        match t.kind {
            TokenKind::Plus => {
                advance(tokens, pos);
                let right = parse_mul_div(tokens, pos)?;
                left = binary_expr(BinaryOp::Add, left, right);
            }
            TokenKind::Minus => {
                advance(tokens, pos);
                let right = parse_mul_div(tokens, pos)?;
                left = binary_expr(BinaryOp::Sub, left, right);
            }
            _ => break,
        }
    }
    Ok(left)
}

// Level 2: multiplication, division, modulo
fn parse_mul_div(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
    let mut left = parse_power(tokens, pos)?;
    while let Some(t) = peek(tokens, pos) {
        match t.kind {
            TokenKind::Star => {
                advance(tokens, pos);
                let right = parse_power(tokens, pos)?;
                left = binary_expr(BinaryOp::Mul, left, right);
            }
            TokenKind::Slash => {
                advance(tokens, pos);
                let right = parse_power(tokens, pos)?;
                left = binary_expr(BinaryOp::Div, left, right);
            }
            TokenKind::Percent => {
                advance(tokens, pos);
                let right = parse_power(tokens, pos)?;
                left = binary_expr(BinaryOp::Mod, left, right);
            }
            _ => break,
        }
    }
    Ok(left)
}

// Level 3: exponentiation (right-associative)
fn parse_power(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
    let base = parse_unary(tokens, pos)?;
    if let Some(t) = peek(tokens, pos) {
        if t.kind == TokenKind::Power {
            advance(tokens, pos);
            let exponent = parse_power(tokens, pos)?; // right-recursive
            return Ok(binary_expr(BinaryOp::Pow, base, exponent));
        }
    }
    Ok(base)
}

// Level 4: unary minus
fn parse_unary(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
    if let Some(t) = peek(tokens, pos) {
        if t.kind == TokenKind::Minus {
            advance(tokens, pos);
            let operand = parse_unary(tokens, pos)?;
            return Ok(unary_expr(operand));
        }
    }
    parse_atom(tokens, pos)
}

// Level 5: atoms -- numbers and parenthesized expressions
fn parse_atom(tokens: &[Token], pos: &mut usize) -> Result<AstNode, String> {
    let t = match peek(tokens, pos) {
        Some(t) => t,
        None => return Err("Unexpected end of input".to_string()),
    };

    if t.kind == TokenKind::Number {
        let value: f64 = t
            .value
            .parse()
            .map_err(|_| format!("Invalid number: {}", t.value))?;
        advance(tokens, pos);
        return Ok(number_literal(value));
    }

    if t.kind == TokenKind::LParen {
        advance(tokens, pos);
        let expr = parse_add_sub(tokens, pos)?;
        expect(tokens, pos, TokenKind::RParen)?;
        return Ok(expr);
    }

    Err(format!("Unexpected token: {} '{}'", t.kind, t.value))
}

// ── Evaluator ────────────────────────────────────────────────────────────────

pub fn evaluate(node: &AstNode) -> Result<f64, String> {
    match node {
        AstNode::Number(value) => Ok(*value),
        AstNode::Unary { operand, .. } => {
            let val = evaluate(operand)?;
            Ok(-val)
        }
        AstNode::Binary { op, left, right } => {
            let l = evaluate(left)?;
            let r = evaluate(right)?;
            match op {
                BinaryOp::Add => Ok(l + r),
                BinaryOp::Sub => Ok(l - r),
                BinaryOp::Mul => Ok(l * r),
                BinaryOp::Pow => Ok(l.powf(r)),
                BinaryOp::Div => {
                    if r == 0.0 {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(l / r)
                    }
                }
                BinaryOp::Mod => {
                    if r == 0.0 {
                        Err("Modulo by zero".to_string())
                    } else {
                        Ok(l % r)
                    }
                }
            }
        }
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

pub fn calc(expression: &str) -> Result<f64, String> {
    if expression.trim().is_empty() {
        return Err("Empty expression".to_string());
    }
    let tokens = tokenize(expression)?;
    let ast = parse(&tokens)?;
    evaluate(&ast)
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── token-types tests ────────────────────────────────────────────────

    mod token_types {
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
                Token { kind: TokenKind::Plus, value: "+".to_string() }
            );
            assert_eq!(
                token(TokenKind::Minus, "-"),
                Token { kind: TokenKind::Minus, value: "-".to_string() }
            );
            assert_eq!(
                token(TokenKind::Star, "*"),
                Token { kind: TokenKind::Star, value: "*".to_string() }
            );
            assert_eq!(
                token(TokenKind::Slash, "/"),
                Token { kind: TokenKind::Slash, value: "/".to_string() }
            );
            assert_eq!(
                token(TokenKind::Percent, "%"),
                Token { kind: TokenKind::Percent, value: "%".to_string() }
            );
            assert_eq!(
                token(TokenKind::Power, "**"),
                Token { kind: TokenKind::Power, value: "**".to_string() }
            );
            assert_eq!(
                token(TokenKind::LParen, "("),
                Token { kind: TokenKind::LParen, value: "(".to_string() }
            );
            assert_eq!(
                token(TokenKind::RParen, ")"),
                Token { kind: TokenKind::RParen, value: ")".to_string() }
            );
        }
    }

    // ── ast-types tests ──────────────────────────────────────────────────

    mod ast_types {
        use super::*;

        #[test]
        fn number_literal_creates_a_number_node() {
            let n = number_literal(42.0);
            assert_eq!(n, AstNode::Number(42.0));
        }

        #[test]
        fn unary_expr_creates_a_unary_node() {
            let operand = number_literal(5.0);
            let u = unary_expr(operand);
            assert_eq!(
                u,
                AstNode::Unary {
                    op: UnaryOp::Neg,
                    operand: Box::new(AstNode::Number(5.0)),
                }
            );
        }

        #[test]
        fn binary_expr_creates_a_binary_node() {
            let left = number_literal(2.0);
            let right = number_literal(3.0);
            let b = binary_expr(BinaryOp::Add, left, right);
            assert_eq!(
                b,
                AstNode::Binary {
                    op: BinaryOp::Add,
                    left: Box::new(AstNode::Number(2.0)),
                    right: Box::new(AstNode::Number(3.0)),
                }
            );
        }

        #[test]
        fn nested_expressions() {
            // (2 + 3) * -4
            let inner = binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0));
            let neg = unary_expr(number_literal(4.0));
            let expr = binary_expr(BinaryOp::Mul, inner, neg);

            match &expr {
                AstNode::Binary { op, left, right } => {
                    assert_eq!(*op, BinaryOp::Mul);
                    assert_eq!(
                        **left,
                        AstNode::Binary {
                            op: BinaryOp::Add,
                            left: Box::new(AstNode::Number(2.0)),
                            right: Box::new(AstNode::Number(3.0)),
                        }
                    );
                    assert_eq!(
                        **right,
                        AstNode::Unary {
                            op: UnaryOp::Neg,
                            operand: Box::new(AstNode::Number(4.0)),
                        }
                    );
                }
                _ => panic!("Expected Binary node"),
            }
        }
    }

    // ── tokenizer tests ──────────────────────────────────────────────────

    mod tokenizer {
        use super::*;

        #[test]
        fn empty_string() {
            assert_eq!(tokenize("").unwrap(), vec![]);
        }

        #[test]
        fn whitespace_only() {
            assert_eq!(tokenize("   \t\n\r  ").unwrap(), vec![]);
        }

        #[test]
        fn single_integer() {
            assert_eq!(
                tokenize("42").unwrap(),
                vec![token(TokenKind::Number, "42")]
            );
        }

        #[test]
        fn decimal_number() {
            assert_eq!(
                tokenize("3.14").unwrap(),
                vec![token(TokenKind::Number, "3.14")]
            );
        }

        #[test]
        fn number_starting_with_dot() {
            assert_eq!(
                tokenize(".5").unwrap(),
                vec![token(TokenKind::Number, ".5")]
            );
        }

        #[test]
        fn all_operators() {
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
        fn parentheses() {
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
        fn complex_expression() {
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
        fn power_operator_distinguished_from_multiply() {
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
        fn no_whitespace() {
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
        fn multiple_decimals_in_one_number_throws() {
            let err = tokenize("1.2.3").unwrap_err();
            assert!(err.contains("Unexpected character '.'"), "got: {}", err);
        }

        #[test]
        fn unrecognized_character_throws() {
            let err = tokenize("2 @ 3").unwrap_err();
            assert!(err.contains("Unexpected character '@'"), "got: {}", err);
        }

        #[test]
        fn unrecognized_character_reports_position() {
            let err = tokenize("2 @ 3").unwrap_err();
            assert!(err.contains("position 2"), "got: {}", err);
        }
    }

    // ── parser tests ─────────────────────────────────────────────────────

    mod parser_tests {
        use super::*;

        // Helper: tokenize then parse
        fn p(input: &str) -> AstNode {
            let tokens = tokenize(input).unwrap();
            parse(&tokens).unwrap()
        }

        // atoms

        #[test]
        fn single_number() {
            assert_eq!(p("42"), AstNode::Number(42.0));
        }

        #[test]
        fn decimal_number() {
            assert_eq!(p("3.14"), AstNode::Number(3.14));
        }

        #[test]
        fn parenthesized_number() {
            assert_eq!(p("(42)"), AstNode::Number(42.0));
        }

        #[test]
        fn nested_parentheses() {
            assert_eq!(p("((7))"), AstNode::Number(7.0));
        }

        // binary operations

        #[test]
        fn addition() {
            assert_eq!(
                p("2 + 3"),
                binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0))
            );
        }

        #[test]
        fn subtraction() {
            assert_eq!(
                p("5 - 1"),
                binary_expr(BinaryOp::Sub, number_literal(5.0), number_literal(1.0))
            );
        }

        #[test]
        fn multiplication() {
            assert_eq!(
                p("4 * 6"),
                binary_expr(BinaryOp::Mul, number_literal(4.0), number_literal(6.0))
            );
        }

        #[test]
        fn division() {
            assert_eq!(
                p("10 / 2"),
                binary_expr(BinaryOp::Div, number_literal(10.0), number_literal(2.0))
            );
        }

        #[test]
        fn modulo() {
            assert_eq!(
                p("10 % 3"),
                binary_expr(BinaryOp::Mod, number_literal(10.0), number_literal(3.0))
            );
        }

        #[test]
        fn power() {
            assert_eq!(
                p("2 ** 3"),
                binary_expr(BinaryOp::Pow, number_literal(2.0), number_literal(3.0))
            );
        }

        // precedence

        #[test]
        fn multiply_before_add() {
            // 2 + 3 * 4 -> 2 + (3 * 4)
            assert_eq!(
                p("2 + 3 * 4"),
                binary_expr(
                    BinaryOp::Add,
                    number_literal(2.0),
                    binary_expr(BinaryOp::Mul, number_literal(3.0), number_literal(4.0))
                )
            );
        }

        #[test]
        fn power_before_multiply() {
            // 2 * 3 ** 2 -> 2 * (3 ** 2)
            assert_eq!(
                p("2 * 3 ** 2"),
                binary_expr(
                    BinaryOp::Mul,
                    number_literal(2.0),
                    binary_expr(BinaryOp::Pow, number_literal(3.0), number_literal(2.0))
                )
            );
        }

        #[test]
        fn parens_override_precedence() {
            // (2 + 3) * 4
            assert_eq!(
                p("(2 + 3) * 4"),
                binary_expr(
                    BinaryOp::Mul,
                    binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0)),
                    number_literal(4.0)
                )
            );
        }

        // associativity

        #[test]
        fn left_associative_add() {
            // 1 - 2 - 3 -> (1 - 2) - 3
            assert_eq!(
                p("1 - 2 - 3"),
                binary_expr(
                    BinaryOp::Sub,
                    binary_expr(BinaryOp::Sub, number_literal(1.0), number_literal(2.0)),
                    number_literal(3.0)
                )
            );
        }

        #[test]
        fn left_associative_multiply() {
            // 12 / 3 / 2 -> (12 / 3) / 2
            assert_eq!(
                p("12 / 3 / 2"),
                binary_expr(
                    BinaryOp::Div,
                    binary_expr(BinaryOp::Div, number_literal(12.0), number_literal(3.0)),
                    number_literal(2.0)
                )
            );
        }

        #[test]
        fn right_associative_power() {
            // 2 ** 3 ** 2 -> 2 ** (3 ** 2)
            assert_eq!(
                p("2 ** 3 ** 2"),
                binary_expr(
                    BinaryOp::Pow,
                    number_literal(2.0),
                    binary_expr(BinaryOp::Pow, number_literal(3.0), number_literal(2.0))
                )
            );
        }

        // unary

        #[test]
        fn unary_minus() {
            assert_eq!(p("-5"), unary_expr(number_literal(5.0)));
        }

        #[test]
        fn double_unary_minus() {
            assert_eq!(p("--5"), unary_expr(unary_expr(number_literal(5.0))));
        }

        #[test]
        fn unary_in_expression() {
            // 2 * -3
            assert_eq!(
                p("2 * -3"),
                binary_expr(
                    BinaryOp::Mul,
                    number_literal(2.0),
                    unary_expr(number_literal(3.0))
                )
            );
        }

        // errors

        #[test]
        fn empty_token_list() {
            let err = parse(&[]).unwrap_err();
            assert!(err.contains("Unexpected end of input"), "got: {}", err);
        }

        #[test]
        fn unmatched_left_paren() {
            let tokens = tokenize("(2 + 3").unwrap();
            let err = parse(&tokens).unwrap_err();
            assert!(err.contains("Expected rparen"), "got: {}", err);
        }

        #[test]
        fn unmatched_right_paren() {
            let tokens = tokenize("2 + 3)").unwrap();
            let err = parse(&tokens).unwrap_err();
            assert!(
                err.contains("Unexpected token after expression"),
                "got: {}",
                err
            );
        }

        #[test]
        fn unexpected_operator_at_start() {
            let tokens = tokenize("* 5").unwrap();
            let err = parse(&tokens).unwrap_err();
            assert!(err.contains("Unexpected token: star"), "got: {}", err);
        }

        #[test]
        fn trailing_operator() {
            let tokens = tokenize("2 +").unwrap();
            let err = parse(&tokens).unwrap_err();
            assert!(err.contains("Unexpected end of input"), "got: {}", err);
        }
    }

    // ── evaluator tests ──────────────────────────────────────────────────

    mod evaluator_tests {
        use super::*;

        #[test]
        fn number_literal_eval() {
            assert_eq!(evaluate(&number_literal(42.0)).unwrap(), 42.0);
        }

        #[test]
        fn unary_negation() {
            assert_eq!(evaluate(&unary_expr(number_literal(5.0))).unwrap(), -5.0);
        }

        #[test]
        fn addition() {
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
        fn subtraction() {
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
        fn multiplication() {
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
        fn division() {
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
        fn modulo() {
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
        fn power() {
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
        fn division_by_zero_throws() {
            let err = evaluate(&binary_expr(
                BinaryOp::Div,
                number_literal(1.0),
                number_literal(0.0),
            ))
            .unwrap_err();
            assert!(err.contains("Division by zero"), "got: {}", err);
        }

        #[test]
        fn modulo_by_zero_throws() {
            let err = evaluate(&binary_expr(
                BinaryOp::Mod,
                number_literal(1.0),
                number_literal(0.0),
            ))
            .unwrap_err();
            assert!(err.contains("Modulo by zero"), "got: {}", err);
        }

        #[test]
        fn nested_expression() {
            // (2 + 3) * -4
            let expr = binary_expr(
                BinaryOp::Mul,
                binary_expr(BinaryOp::Add, number_literal(2.0), number_literal(3.0)),
                unary_expr(number_literal(4.0)),
            );
            assert_eq!(evaluate(&expr).unwrap(), -20.0);
        }
    }

    // ── calc (end-to-end) tests ──────────────────────────────────────────

    mod calc_tests {
        use super::*;

        // basic arithmetic

        #[test]
        fn basic_addition() {
            assert_eq!(calc("1 + 2").unwrap(), 3.0);
        }

        #[test]
        fn basic_subtraction() {
            assert_eq!(calc("10 - 3").unwrap(), 7.0);
        }

        #[test]
        fn basic_multiplication() {
            assert_eq!(calc("4 * 5").unwrap(), 20.0);
        }

        #[test]
        fn basic_division() {
            assert_eq!(calc("15 / 4").unwrap(), 3.75);
        }

        #[test]
        fn basic_modulo() {
            assert_eq!(calc("10 % 3").unwrap(), 1.0);
        }

        #[test]
        fn basic_power() {
            assert_eq!(calc("2 ** 8").unwrap(), 256.0);
        }

        // precedence

        #[test]
        fn precedence_add_mul() {
            assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
        }

        #[test]
        fn precedence_mul_add() {
            assert_eq!(calc("2 * 3 + 4").unwrap(), 10.0);
        }

        #[test]
        fn precedence_sub_mul() {
            assert_eq!(calc("10 - 2 * 3").unwrap(), 4.0);
        }

        #[test]
        fn precedence_add_pow() {
            assert_eq!(calc("2 + 3 ** 2").unwrap(), 11.0);
        }

        #[test]
        fn precedence_mul_pow() {
            assert_eq!(calc("2 * 3 ** 2").unwrap(), 18.0);
        }

        #[test]
        fn precedence_pow_mul() {
            assert_eq!(calc("2 ** 3 * 4").unwrap(), 32.0);
        }

        // parentheses

        #[test]
        fn parens_add_mul() {
            assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
        }

        #[test]
        fn parens_mul_add() {
            assert_eq!(calc("2 * (3 + 4)").unwrap(), 14.0);
        }

        #[test]
        fn parens_both_sides() {
            assert_eq!(calc("(2 + 3) * (4 + 5)").unwrap(), 45.0);
        }

        #[test]
        fn parens_nested() {
            assert_eq!(calc("((1 + 2) * (3 + 4))").unwrap(), 21.0);
        }

        #[test]
        fn parens_single_number() {
            assert_eq!(calc("(10)").unwrap(), 10.0);
        }

        // associativity

        #[test]
        fn assoc_sub_sub() {
            assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
        }

        #[test]
        fn assoc_sub_add() {
            assert_eq!(calc("1 - 2 + 3").unwrap(), 2.0);
        }

        #[test]
        fn assoc_div_div() {
            assert_eq!(calc("12 / 3 / 2").unwrap(), 2.0);
        }

        #[test]
        fn assoc_pow_pow() {
            assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
        }

        // unary minus

        #[test]
        fn unary_neg() {
            assert_eq!(calc("-5").unwrap(), -5.0);
        }

        #[test]
        fn unary_double_neg() {
            assert_eq!(calc("--5").unwrap(), 5.0);
        }

        #[test]
        fn unary_paren_neg() {
            assert_eq!(calc("-(-5)").unwrap(), 5.0);
        }

        #[test]
        fn unary_mul_neg() {
            assert_eq!(calc("2 * -3").unwrap(), -6.0);
        }

        #[test]
        fn unary_neg_pow() {
            assert_eq!(calc("-2 ** 2").unwrap(), 4.0);
        }

        #[test]
        fn unary_neg_paren_pow() {
            assert_eq!(calc("-(2 ** 2)").unwrap(), -4.0);
        }

        // decimals

        #[test]
        fn decimal_addition() {
            assert_eq!(calc("0.1 + 0.2").unwrap(), 0.1_f64 + 0.2_f64);
        }

        #[test]
        fn decimal_multiplication() {
            assert_eq!(calc("3.14 * 2").unwrap(), 6.28);
        }

        #[test]
        fn decimal_dot_prefix() {
            assert_eq!(calc(".5 + .5").unwrap(), 1.0);
        }

        // complex expressions

        #[test]
        fn complex_add_mul_sub() {
            assert_eq!(calc("2 + 3 * 4 - 1").unwrap(), 13.0);
        }

        #[test]
        fn complex_parens_div() {
            assert_eq!(calc("(2 + 3) * (4 - 1) / 5").unwrap(), 3.0);
        }

        #[test]
        fn complex_mod_pow() {
            assert_eq!(calc("10 % 3 + 2 ** 3").unwrap(), 9.0);
        }

        #[test]
        fn complex_pow_paren() {
            assert_eq!(calc("2 ** (1 + 2)").unwrap(), 8.0);
        }

        #[test]
        fn complex_div_div_add() {
            assert_eq!(calc("100 / 10 / 2 + 3").unwrap(), 8.0);
        }

        // errors

        #[test]
        fn error_empty_expression() {
            let err = calc("").unwrap_err();
            assert!(err.contains("Empty expression"), "got: {}", err);
        }

        #[test]
        fn error_whitespace_only() {
            let err = calc("   ").unwrap_err();
            assert!(err.contains("Empty expression"), "got: {}", err);
        }

        #[test]
        fn error_division_by_zero() {
            let err = calc("1 / 0").unwrap_err();
            assert!(err.contains("Division by zero"), "got: {}", err);
        }

        #[test]
        fn error_modulo_by_zero() {
            let err = calc("5 % 0").unwrap_err();
            assert!(err.contains("Modulo by zero"), "got: {}", err);
        }

        #[test]
        fn error_unmatched_paren() {
            assert!(calc("(2 + 3").is_err());
        }

        #[test]
        fn error_invalid_character() {
            assert!(calc("2 @ 3").is_err());
        }

        #[test]
        fn error_trailing_operator() {
            assert!(calc("2 +").is_err());
        }
    }
}
