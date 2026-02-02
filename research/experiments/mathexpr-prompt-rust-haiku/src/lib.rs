use std::str::Chars;
use std::iter::Peekable;

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Number(f64),
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    StarStar,
    LeftParen,
    RightParen,
}

#[derive(Debug, Clone)]
enum Expr {
    Number(f64),
    BinOp {
        left: Box<Expr>,
        op: BinOp,
        right: Box<Expr>,
    },
    UnaryMinus(Box<Expr>),
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

struct Tokenizer<'a> {
    chars: Peekable<Chars<'a>>,
}

impl<'a> Tokenizer<'a> {
    fn new(input: &'a str) -> Self {
        Tokenizer {
            chars: input.chars().peekable(),
        }
    }

    fn skip_whitespace(&mut self) {
        while let Some(&ch) = self.chars.peek() {
            if ch.is_whitespace() {
                self.chars.next();
            } else {
                break;
            }
        }
    }

    fn read_number(&mut self) -> Result<f64, String> {
        let mut num_str = String::new();
        
        // Handle leading dot like ".5"
        if let Some(&'.') = self.chars.peek() {
            num_str.push('.');
            self.chars.next();
        }
        
        // Read digits
        while let Some(&ch) = self.chars.peek() {
            if ch.is_ascii_digit() {
                num_str.push(ch);
                self.chars.next();
            } else if ch == '.' && !num_str.contains('.') {
                num_str.push(ch);
                self.chars.next();
            } else {
                break;
            }
        }
        
        if num_str.is_empty() || num_str == "." {
            return Err("Invalid number".to_string());
        }
        
        num_str.parse::<f64>()
            .map_err(|_| "Invalid number".to_string())
    }

    fn next_token(&mut self) -> Result<Option<Token>, String> {
        self.skip_whitespace();
        
        match self.chars.peek() {
            None => Ok(None),
            Some(&ch) => {
                match ch {
                    '+' => {
                        self.chars.next();
                        Ok(Some(Token::Plus))
                    }
                    '-' => {
                        self.chars.next();
                        Ok(Some(Token::Minus))
                    }
                    '*' => {
                        self.chars.next();
                        if let Some(&'*') = self.chars.peek() {
                            self.chars.next();
                            Ok(Some(Token::StarStar))
                        } else {
                            Ok(Some(Token::Star))
                        }
                    }
                    '/' => {
                        self.chars.next();
                        Ok(Some(Token::Slash))
                    }
                    '%' => {
                        self.chars.next();
                        Ok(Some(Token::Percent))
                    }
                    '(' => {
                        self.chars.next();
                        Ok(Some(Token::LeftParen))
                    }
                    ')' => {
                        self.chars.next();
                        Ok(Some(Token::RightParen))
                    }
                    '.' => {
                        let num = self.read_number()?;
                        Ok(Some(Token::Number(num)))
                    }
                    c if c.is_ascii_digit() => {
                        let num = self.read_number()?;
                        Ok(Some(Token::Number(num)))
                    }
                    _ => Err(format!("Invalid character: {}", ch)),
                }
            }
        }
    }
}

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(input: &str) -> Result<Self, String> {
        let mut tokenizer = Tokenizer::new(input);
        let mut tokens = Vec::new();
        
        while let Some(token) = tokenizer.next_token()? {
            tokens.push(token);
        }
        
        Ok(Parser { tokens, pos: 0 })
    }

    fn current(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }

    fn advance(&mut self) {
        self.pos += 1;
    }

    fn expect(&mut self, expected: Token) -> Result<(), String> {
        match self.current() {
            Some(token) if std::mem::discriminant(token) == std::mem::discriminant(&expected) => {
                self.advance();
                Ok(())
            }
            Some(token) => Err(format!("Expected {:?}, got {:?}", expected, token)),
            None => Err(format!("Expected {:?}, got EOF", expected)),
        }
    }

    fn parse(&mut self) -> Result<Expr, String> {
        let expr = self.parse_expression()?;
        if self.current().is_some() {
            return Err("Unexpected token after expression".to_string());
        }
        Ok(expr)
    }

    // Lowest precedence: addition and subtraction (left-associative)
    fn parse_expression(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_term()?;
        
        while let Some(token) = self.current() {
            let op = match token {
                Token::Plus => BinOp::Add,
                Token::Minus => BinOp::Sub,
                _ => break,
            };
            self.advance();
            let right = self.parse_term()?;
            left = Expr::BinOp {
                left: Box::new(left),
                op,
                right: Box::new(right),
            };
        }
        
        Ok(left)
    }

    // Second precedence: multiplication, division, modulo (left-associative)
    fn parse_term(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_factor()?;
        
        while let Some(token) = self.current() {
            let op = match token {
                Token::Star => BinOp::Mul,
                Token::Slash => BinOp::Div,
                Token::Percent => BinOp::Mod,
                _ => break,
            };
            self.advance();
            let right = self.parse_factor()?;
            left = Expr::BinOp {
                left: Box::new(left),
                op,
                right: Box::new(right),
            };
        }
        
        Ok(left)
    }

    // Third precedence: exponentiation (right-associative)
    fn parse_factor(&mut self) -> Result<Expr, String> {
        let left = self.parse_unary()?;
        
        if let Some(Token::StarStar) = self.current() {
            self.advance();
            // Right-associative: parse the right side recursively
            let right = self.parse_factor()?;
            Ok(Expr::BinOp {
                left: Box::new(left),
                op: BinOp::Pow,
                right: Box::new(right),
            })
        } else {
            Ok(left)
        }
    }

    // Unary operators: unary minus
    fn parse_unary(&mut self) -> Result<Expr, String> {
        match self.current() {
            Some(Token::Minus) => {
                self.advance();
                let expr = self.parse_unary()?; // Right-associative for unary
                Ok(Expr::UnaryMinus(Box::new(expr)))
            }
            _ => self.parse_primary(),
        }
    }

    // Highest precedence: numbers and parentheses
    fn parse_primary(&mut self) -> Result<Expr, String> {
        match self.current() {
            Some(Token::Number(n)) => {
                let num = *n;
                self.advance();
                Ok(Expr::Number(num))
            }
            Some(Token::LeftParen) => {
                self.advance();
                let expr = self.parse_expression()?;
                self.expect(Token::RightParen)?;
                Ok(expr)
            }
            _ => Err("Expected number or '('".to_string()),
        }
    }
}

fn eval(expr: &Expr) -> Result<f64, String> {
    match expr {
        Expr::Number(n) => Ok(*n),
        Expr::UnaryMinus(e) => {
            let val = eval(e)?;
            Ok(-val)
        }
        Expr::BinOp { left, op, right } => {
            let left_val = eval(left)?;
            let right_val = eval(right)?;
            
            match op {
                BinOp::Add => Ok(left_val + right_val),
                BinOp::Sub => Ok(left_val - right_val),
                BinOp::Mul => Ok(left_val * right_val),
                BinOp::Div => {
                    if right_val == 0.0 {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(left_val / right_val)
                    }
                }
                BinOp::Mod => {
                    if right_val == 0.0 {
                        Err("Modulo by zero".to_string())
                    } else {
                        Ok(left_val % right_val)
                    }
                }
                BinOp::Pow => Ok(left_val.powf(right_val)),
            }
        }
    }
}

/// Evaluates a mathematical expression string and returns the result.
/// 
/// Supports: +, -, *, /, %, ** (exponentiation), unary negation, parentheses, and decimals.
/// 
/// # Arguments
/// * `expression` - The mathematical expression to evaluate
/// 
/// # Returns
/// * `Ok(f64)` - The result of the evaluation
/// * `Err(String)` - An error message if evaluation fails
/// 
/// # Examples
/// ```
/// # use mathexpr::calc;
/// assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
/// assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
/// assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0); // Right-associative
/// ```
pub fn calc(expression: &str) -> Result<f64, String> {
    if expression.trim().is_empty() {
        return Err("Empty expression".to_string());
    }
    
    let mut parser = Parser::new(expression)?;
    let expr = parser.parse()?;
    eval(&expr)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_addition() {
        assert_eq!(calc("2 + 3").unwrap(), 5.0);
    }

    #[test]
    fn test_simple_subtraction() {
        assert_eq!(calc("5 - 3").unwrap(), 2.0);
    }

    #[test]
    fn test_simple_multiplication() {
        assert_eq!(calc("4 * 3").unwrap(), 12.0);
    }

    #[test]
    fn test_simple_division() {
        assert_eq!(calc("12 / 4").unwrap(), 3.0);
    }

    #[test]
    fn test_modulo() {
        assert_eq!(calc("10 % 3").unwrap(), 1.0);
    }

    #[test]
    fn test_exponentiation() {
        assert_eq!(calc("2 ** 3").unwrap(), 8.0);
    }

    #[test]
    fn test_exponentiation_right_associative() {
        // 2 ** 3 ** 2 = 2 ** (3 ** 2) = 2 ** 9 = 512
        assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
    }

    #[test]
    fn test_precedence_mul_add() {
        // 2 + 3 * 4 = 2 + 12 = 14
        assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
    }

    #[test]
    fn test_precedence_add_mul() {
        // (2 + 3) * 4 = 5 * 4 = 20
        assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
    }

    #[test]
    fn test_precedence_complex() {
        // 2 + 3 * (4 - 1) = 2 + 3 * 3 = 2 + 9 = 11
        assert_eq!(calc("2 + 3 * (4 - 1)").unwrap(), 11.0);
    }

    #[test]
    fn test_unary_negation() {
        assert_eq!(calc("-5").unwrap(), -5.0);
    }

    #[test]
    fn test_double_negation() {
        assert_eq!(calc("--5").unwrap(), 5.0);
    }

    #[test]
    fn test_unary_with_binary() {
        // 2 * -3 = -6
        assert_eq!(calc("2 * -3").unwrap(), -6.0);
    }

    #[test]
    fn test_negation_with_exponent() {
        // -2 ** 2 = (-2) ** 2 = 4
        assert_eq!(calc("-2 ** 2").unwrap(), 4.0);
    }

    #[test]
    fn test_negation_in_parens() {
        // -(2 ** 2) = -4
        assert_eq!(calc("-(2 ** 2)").unwrap(), -4.0);
    }

    #[test]
    fn test_left_associativity_subtraction() {
        // 1 - 2 - 3 = (1 - 2) - 3 = -1 - 3 = -4
        assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
    }

    #[test]
    fn test_left_associativity_division() {
        // 12 / 2 / 3 = (12 / 2) / 3 = 6 / 3 = 2
        assert_eq!(calc("12 / 2 / 3").unwrap(), 2.0);
    }

    #[test]
    fn test_decimal_numbers() {
        assert_eq!(calc("3.14").unwrap(), 3.14);
    }

    #[test]
    fn test_decimal_operations() {
        assert_eq!(calc("1.5 + 2.5").unwrap(), 4.0);
    }

    #[test]
    fn test_leading_dot() {
        assert_eq!(calc(".5").unwrap(), 0.5);
    }

    #[test]
    fn test_leading_dot_operations() {
        assert_eq!(calc(".5 + .5").unwrap(), 1.0);
    }

    #[test]
    fn test_division_by_zero() {
        assert!(calc("1 / 0").is_err());
        assert_eq!(calc("1 / 0").unwrap_err(), "Division by zero");
    }

    #[test]
    fn test_modulo_by_zero() {
        assert!(calc("5 % 0").is_err());
        assert_eq!(calc("5 % 0").unwrap_err(), "Modulo by zero");
    }

    #[test]
    fn test_empty_input() {
        assert!(calc("").is_err());
    }

    #[test]
    fn test_whitespace_only() {
        assert!(calc("   ").is_err());
    }

    #[test]
    fn test_unmatched_left_paren() {
        assert!(calc("(2 + 3").is_err());
    }

    #[test]
    fn test_unmatched_right_paren() {
        assert!(calc("2 + 3)").is_err());
    }

    #[test]
    fn test_invalid_character() {
        assert!(calc("2 & 3").is_err());
    }

    #[test]
    fn test_malformed_operator_at_end() {
        assert!(calc("2 +").is_err());
    }

    #[test]
    fn test_malformed_operator_at_start() {
        assert!(calc("* 2").is_err());
    }

    #[test]
    fn test_consecutive_operators() {
        // This should be interpreted as unary minus
        assert_eq!(calc("2 * -3").unwrap(), -6.0);
    }

    #[test]
    fn test_multiple_operations() {
        // 1 + 2 + 3 = 6
        assert_eq!(calc("1 + 2 + 3").unwrap(), 6.0);
    }

    #[test]
    fn test_nested_parentheses() {
        // ((2 + 3) * 4) = (5 * 4) = 20
        assert_eq!(calc("((2 + 3) * 4)").unwrap(), 20.0);
    }

    #[test]
    fn test_whitespace_handling() {
        assert_eq!(calc("  2  +  3  ").unwrap(), 5.0);
    }

    #[test]
    fn test_exponentiation_with_negation() {
        // -2 ** 3 should be (-2) ** 3 = -8
        assert_eq!(calc("-2 ** 3").unwrap(), -8.0);
    }

    #[test]
    fn test_complex_expression() {
        // 2 + 3 * 4 ** 2 - 1 = 2 + 3 * 16 - 1 = 2 + 48 - 1 = 49
        assert_eq!(calc("2 + 3 * 4 ** 2 - 1").unwrap(), 49.0);
    }

    #[test]
    fn test_modulo_with_decimals() {
        let result = calc("10.5 % 3").unwrap();
        assert!((result - 1.5).abs() < 1e-10);
    }

    #[test]
    fn test_division_with_decimals() {
        let result = calc("7.5 / 2.5").unwrap();
        assert!((result - 3.0).abs() < 1e-10);
    }

    #[test]
    fn test_zero_operations() {
        assert_eq!(calc("0 + 5").unwrap(), 5.0);
        assert_eq!(calc("0 * 5").unwrap(), 0.0);
    }

    #[test]
    fn test_negative_result() {
        assert_eq!(calc("2 - 5").unwrap(), -3.0);
    }

    #[test]
    fn test_fraction_result() {
        assert_eq!(calc("1 / 2").unwrap(), 0.5);
    }

    #[test]
    fn test_all_operators_together() {
        // Test that all operators work in one expression
        // 2 + 3 - 1 * 4 / 2 % 3 ** 2 is complex; let's be careful with precedence
        // ** has highest precedence: 3 ** 2 = 9
        // Then *, /, %: 1 * 4 = 4, 4 / 2 = 2, 2 % 9 = 2
        // Then +, -: 2 + 3 = 5, 5 - 2 = 3
        assert_eq!(calc("2 + 3 - 1 * 4 / 2 % 3 ** 2").unwrap(), 3.0);
    }

    #[test]
    fn test_parentheses_override_precedence() {
        // (2 + 3) * (4 - 1) = 5 * 3 = 15
        assert_eq!(calc("(2 + 3) * (4 - 1)").unwrap(), 15.0);
    }

    #[test]
    fn test_exponentiation_zero() {
        assert_eq!(calc("2 ** 0").unwrap(), 1.0);
    }

    #[test]
    fn test_exponentiation_negative() {
        assert_eq!(calc("2 ** -1").unwrap(), 0.5);
    }

    #[test]
    fn test_single_number() {
        assert_eq!(calc("42").unwrap(), 42.0);
    }

    #[test]
    fn test_single_decimal() {
        assert_eq!(calc("42.5").unwrap(), 42.5);
    }

    #[test]
    fn test_paren_around_number() {
        assert_eq!(calc("(42)").unwrap(), 42.0);
    }
}
