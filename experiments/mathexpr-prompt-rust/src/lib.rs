/// A math expression evaluator.
///
/// Supports `+`, `-`, `*`, `/`, `%`, `**` (right-associative exponentiation),
/// unary negation, parentheses, and decimal numbers.
///
/// Pipeline: tokenize -> parse (recursive descent) -> evaluate AST.

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Number(f64),
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    DoubleStar,
    LParen,
    RParen,
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let chars: Vec<char> = input.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];

        if ch.is_whitespace() {
            i += 1;
            continue;
        }

        // Numbers: digits or a leading dot followed by digits (e.g. `.5`)
        if ch.is_ascii_digit()
            || (ch == '.' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit())
        {
            let start = i;
            let mut has_dot = ch == '.';
            i += 1;
            while i < chars.len() {
                if chars[i].is_ascii_digit() {
                    i += 1;
                } else if chars[i] == '.' && !has_dot {
                    has_dot = true;
                    i += 1;
                } else {
                    break;
                }
            }
            let num_str: String = chars[start..i].iter().collect();
            let value: f64 = num_str
                .parse()
                .map_err(|_| format!("Invalid number: {}", num_str))?;
            tokens.push(Token::Number(value));
            continue;
        }

        match ch {
            '+' => {
                tokens.push(Token::Plus);
                i += 1;
            }
            '-' => {
                tokens.push(Token::Minus);
                i += 1;
            }
            '*' => {
                if i + 1 < chars.len() && chars[i + 1] == '*' {
                    tokens.push(Token::DoubleStar);
                    i += 2;
                } else {
                    tokens.push(Token::Star);
                    i += 1;
                }
            }
            '/' => {
                tokens.push(Token::Slash);
                i += 1;
            }
            '%' => {
                tokens.push(Token::Percent);
                i += 1;
            }
            '(' => {
                tokens.push(Token::LParen);
                i += 1;
            }
            ')' => {
                tokens.push(Token::RParen);
                i += 1;
            }
            _ => return Err(format!("Invalid character: '{}'", ch)),
        }
    }

    Ok(tokens)
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

#[derive(Debug)]
enum Expr {
    Number(f64),
    UnaryMinus(Box<Expr>),
    BinOp {
        op: BinOp,
        left: Box<Expr>,
        right: Box<Expr>,
    },
}

#[derive(Debug, Clone, Copy)]
enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Pow,
}

// ---------------------------------------------------------------------------
// Parser (recursive descent)
//
// Grammar (lowest to highest precedence):
//   expr       = add_sub
//   add_sub    = mul_div (('+' | '-') mul_div)*
//   mul_div    = exponent (('*' | '/' | '%') exponent)*
//   exponent   = unary ('**' exponent)?        // right-associative
//   unary      = '-' unary | primary
//   primary    = NUMBER | '(' expr ')'
// ---------------------------------------------------------------------------

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Self { tokens, pos: 0 }
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }

    fn advance(&mut self) -> Option<Token> {
        if self.pos < self.tokens.len() {
            let tok = self.tokens[self.pos].clone();
            self.pos += 1;
            Some(tok)
        } else {
            None
        }
    }

    fn parse(&mut self) -> Result<Expr, String> {
        let expr = self.parse_add_sub()?;
        if self.pos < self.tokens.len() {
            return Err(format!("Unexpected token: {:?}", self.tokens[self.pos]));
        }
        Ok(expr)
    }

    fn parse_add_sub(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_mul_div()?;
        loop {
            match self.peek() {
                Some(Token::Plus) => {
                    self.advance();
                    let right = self.parse_mul_div()?;
                    left = Expr::BinOp {
                        op: BinOp::Add,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                Some(Token::Minus) => {
                    self.advance();
                    let right = self.parse_mul_div()?;
                    left = Expr::BinOp {
                        op: BinOp::Sub,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                _ => break,
            }
        }
        Ok(left)
    }

    fn parse_mul_div(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_exponent()?;
        loop {
            match self.peek() {
                Some(Token::Star) => {
                    self.advance();
                    let right = self.parse_exponent()?;
                    left = Expr::BinOp {
                        op: BinOp::Mul,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                Some(Token::Slash) => {
                    self.advance();
                    let right = self.parse_exponent()?;
                    left = Expr::BinOp {
                        op: BinOp::Div,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                Some(Token::Percent) => {
                    self.advance();
                    let right = self.parse_exponent()?;
                    left = Expr::BinOp {
                        op: BinOp::Mod,
                        left: Box::new(left),
                        right: Box::new(right),
                    };
                }
                _ => break,
            }
        }
        Ok(left)
    }

    fn parse_exponent(&mut self) -> Result<Expr, String> {
        let base = self.parse_unary()?;
        if let Some(Token::DoubleStar) = self.peek() {
            self.advance();
            // Right-associative: recurse into parse_exponent, not parse_unary
            let exp = self.parse_exponent()?;
            Ok(Expr::BinOp {
                op: BinOp::Pow,
                left: Box::new(base),
                right: Box::new(exp),
            })
        } else {
            Ok(base)
        }
    }

    fn parse_unary(&mut self) -> Result<Expr, String> {
        if let Some(Token::Minus) = self.peek() {
            self.advance();
            let operand = self.parse_unary()?;
            Ok(Expr::UnaryMinus(Box::new(operand)))
        } else {
            self.parse_primary()
        }
    }

    fn parse_primary(&mut self) -> Result<Expr, String> {
        match self.advance() {
            Some(Token::Number(n)) => Ok(Expr::Number(n)),
            Some(Token::LParen) => {
                let expr = self.parse_add_sub()?;
                match self.advance() {
                    Some(Token::RParen) => Ok(expr),
                    _ => Err("Unmatched parenthesis: missing ')'".to_string()),
                }
            }
            Some(tok) => Err(format!("Unexpected token: {:?}", tok)),
            None => Err("Unexpected end of expression".to_string()),
        }
    }
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

fn eval(expr: &Expr) -> Result<f64, String> {
    match expr {
        Expr::Number(n) => Ok(*n),
        Expr::UnaryMinus(inner) => Ok(-eval(inner)?),
        Expr::BinOp { op, left, right } => {
            let l = eval(left)?;
            let r = eval(right)?;
            match op {
                BinOp::Add => Ok(l + r),
                BinOp::Sub => Ok(l - r),
                BinOp::Mul => Ok(l * r),
                BinOp::Div => {
                    if r == 0.0 {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(l / r)
                    }
                }
                BinOp::Mod => {
                    if r == 0.0 {
                        Err("Modulo by zero".to_string())
                    } else {
                        Ok(l % r)
                    }
                }
                BinOp::Pow => Ok(l.powf(r)),
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Evaluate a math expression string and return its numeric result.
///
/// # Examples
/// ```
/// use mathexpr_prompt_rust::calc;
/// assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
/// ```
pub fn calc(expression: &str) -> Result<f64, String> {
    let trimmed = expression.trim();
    if trimmed.is_empty() {
        return Err("Empty input".to_string());
    }
    let tokens = tokenize(trimmed)?;
    if tokens.is_empty() {
        return Err("Empty input".to_string());
    }
    let mut parser = Parser::new(tokens);
    let ast = parser.parse()?;
    eval(&ast)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to assert approximate equality for floating-point results.
    fn assert_calc(expr: &str, expected: f64) {
        let result = calc(expr).unwrap_or_else(|e| panic!("calc(\"{}\") failed: {}", expr, e));
        assert!(
            (result - expected).abs() < 1e-9,
            "calc(\"{}\") = {}, expected {}",
            expr,
            result,
            expected
        );
    }

    fn assert_err(expr: &str) {
        assert!(
            calc(expr).is_err(),
            "Expected error for calc(\"{}\"), got {:?}",
            expr,
            calc(expr)
        );
    }

    // --- Basic arithmetic ---

    #[test]
    fn simple_addition() {
        assert_calc("1 + 2", 3.0);
    }

    #[test]
    fn simple_subtraction() {
        assert_calc("10 - 3", 7.0);
    }

    #[test]
    fn simple_multiplication() {
        assert_calc("4 * 5", 20.0);
    }

    #[test]
    fn simple_division() {
        assert_calc("20 / 4", 5.0);
    }

    #[test]
    fn simple_modulo() {
        assert_calc("10 % 3", 1.0);
    }

    #[test]
    fn simple_exponentiation() {
        assert_calc("2 ** 10", 1024.0);
    }

    // --- Precedence ---

    #[test]
    fn precedence_add_mul() {
        assert_calc("2 + 3 * 4", 14.0);
    }

    #[test]
    fn precedence_mul_add() {
        assert_calc("3 * 4 + 2", 14.0);
    }

    #[test]
    fn precedence_sub_div() {
        assert_calc("10 - 6 / 2", 7.0);
    }

    #[test]
    fn precedence_exp_mul() {
        assert_calc("2 * 3 ** 2", 18.0);
    }

    #[test]
    fn precedence_exp_add() {
        assert_calc("1 + 2 ** 3", 9.0);
    }

    #[test]
    fn full_example() {
        assert_calc("2 + 3 * (4 - 1)", 11.0);
    }

    // --- Associativity ---

    #[test]
    fn left_assoc_subtraction() {
        assert_calc("1 - 2 - 3", -4.0);
    }

    #[test]
    fn left_assoc_division() {
        assert_calc("12 / 3 / 2", 2.0);
    }

    #[test]
    fn right_assoc_exponentiation() {
        assert_calc("2 ** 3 ** 2", 512.0);
    }

    // --- Unary minus ---

    #[test]
    fn unary_negation() {
        assert_calc("-5", -5.0);
    }

    #[test]
    fn double_negation() {
        assert_calc("--5", 5.0);
    }

    #[test]
    fn triple_negation() {
        assert_calc("---5", -5.0);
    }

    #[test]
    fn unary_in_expression() {
        assert_calc("2 * -3", -6.0);
    }

    #[test]
    fn unary_after_plus() {
        assert_calc("2 + -3", -1.0);
    }

    #[test]
    fn unary_before_parens() {
        assert_calc("-(3 + 4)", -7.0);
    }

    #[test]
    fn unary_and_exponent() {
        // Unary is higher precedence than **, so -2 ** 2 = (-2) ** 2 = 4
        assert_calc("-2 ** 2", 4.0);
    }

    // --- Parentheses ---

    #[test]
    fn parentheses_override_precedence() {
        assert_calc("(2 + 3) * 4", 20.0);
    }

    #[test]
    fn nested_parentheses() {
        assert_calc("((2 + 3))", 5.0);
    }

    #[test]
    fn complex_nested() {
        assert_calc("(1 + (2 * (3 + 4)))", 15.0);
    }

    // --- Decimals ---

    #[test]
    fn decimal_numbers() {
        assert_calc("3.14 + 1.86", 5.0);
    }

    #[test]
    fn leading_dot_decimal() {
        assert_calc(".5 + .5", 1.0);
    }

    #[test]
    fn decimal_multiplication() {
        assert_calc("0.1 * 10", 1.0);
    }

    // --- Whitespace handling ---

    #[test]
    fn no_spaces() {
        assert_calc("2+3*4", 14.0);
    }

    #[test]
    fn extra_spaces() {
        assert_calc("  2  +  3  ", 5.0);
    }

    // --- Single number ---

    #[test]
    fn single_number() {
        assert_calc("42", 42.0);
    }

    #[test]
    fn single_decimal() {
        assert_calc("3.14", 3.14);
    }

    // --- Error cases ---

    #[test]
    fn error_empty() {
        assert_err("");
    }

    #[test]
    fn error_whitespace_only() {
        assert_err("   ");
    }

    #[test]
    fn error_division_by_zero() {
        assert_err("1 / 0");
    }

    #[test]
    fn error_modulo_by_zero() {
        assert_err("10 % 0");
    }

    #[test]
    fn error_unmatched_open_paren() {
        assert_err("(1 + 2");
    }

    #[test]
    fn error_unmatched_close_paren() {
        assert_err("1 + 2)");
    }

    #[test]
    fn error_invalid_character() {
        assert_err("2 & 3");
    }

    #[test]
    fn error_trailing_operator() {
        assert_err("2 +");
    }

    #[test]
    fn error_leading_operator() {
        assert_err("* 2");
    }

    #[test]
    fn error_double_operator() {
        assert_err("2 + * 3");
    }

    #[test]
    fn error_empty_parens() {
        assert_err("()");
    }

    // --- Compound expressions ---

    #[test]
    fn compound_all_ops() {
        // 2 + 3 * 4 - 6 / 2 % 3 = 2 + 12 - (3 % 3) = 2 + 12 - 0 = 14
        assert_calc("2 + 3 * 4 - 6 / 2 % 3", 14.0);
    }

    #[test]
    fn exponent_chain() {
        assert_calc("3 ** 2 ** 1", 9.0);
    }

    #[test]
    fn mixed_unary_and_binary() {
        assert_calc("-1 + -2 + -3", -6.0);
    }

    #[test]
    fn exponent_of_zero() {
        assert_calc("5 ** 0", 1.0);
    }

    #[test]
    fn zero_exponent_base() {
        assert_calc("0 ** 5", 0.0);
    }

    #[test]
    fn modulo_negative() {
        assert_calc("-7 % 3", -1.0);
    }

    #[test]
    fn complex_expression() {
        assert_calc("(2 + 3) ** 2 * 4 - 10 / 2", 95.0);
    }
}
