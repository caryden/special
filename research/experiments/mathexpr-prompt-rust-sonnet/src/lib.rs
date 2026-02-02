//! Math expression evaluator with support for basic arithmetic operations,
//! exponentiation, unary negation, and parentheses.

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Number(f64),
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    StarStar,
    LParen,
    RParen,
}

#[derive(Debug, Clone)]
enum Expr {
    Number(f64),
    UnaryMinus(Box<Expr>),
    BinaryOp {
        left: Box<Expr>,
        op: BinaryOp,
        right: Box<Expr>,
    },
}

#[derive(Debug, Clone, Copy)]
enum BinaryOp {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Pow,
}

/// Public API: Evaluates a mathematical expression string and returns the result.
///
/// # Arguments
/// * `expression` - A string containing a mathematical expression
///
/// # Returns
/// * `Ok(f64)` - The calculated result
/// * `Err(String)` - An error message if the expression is invalid
///
/// # Examples
/// ```
/// use mathexpr::calc;
/// assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
/// assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
/// ```
pub fn calc(expression: &str) -> Result<f64, String> {
    if expression.trim().is_empty() {
        return Err("Empty input".to_string());
    }
    
    let tokens = tokenize(expression)?;
    let expr = parse(tokens)?;
    eval(&expr)
}

/// Tokenizes the input string into a sequence of tokens.
fn tokenize(input: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let mut chars = input.chars().peekable();
    
    while let Some(&ch) = chars.peek() {
        match ch {
            ' ' | '\t' | '\n' | '\r' => {
                chars.next();
            }
            '0'..='9' | '.' => {
                let mut num_str = String::new();
                
                while let Some(&c) = chars.peek() {
                    if c.is_ascii_digit() || c == '.' {
                        num_str.push(c);
                        chars.next();
                    } else {
                        break;
                    }
                }
                
                let num = num_str.parse::<f64>()
                    .map_err(|_| format!("Invalid number: {}", num_str))?;
                tokens.push(Token::Number(num));
            }
            '+' => {
                chars.next();
                tokens.push(Token::Plus);
            }
            '-' => {
                chars.next();
                tokens.push(Token::Minus);
            }
            '*' => {
                chars.next();
                if chars.peek() == Some(&'*') {
                    chars.next();
                    tokens.push(Token::StarStar);
                } else {
                    tokens.push(Token::Star);
                }
            }
            '/' => {
                chars.next();
                tokens.push(Token::Slash);
            }
            '%' => {
                chars.next();
                tokens.push(Token::Percent);
            }
            '(' => {
                chars.next();
                tokens.push(Token::LParen);
            }
            ')' => {
                chars.next();
                tokens.push(Token::RParen);
            }
            _ => {
                return Err(format!("Invalid character: {}", ch));
            }
        }
    }
    
    Ok(tokens)
}

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Parser { tokens, pos: 0 }
    }
    
    fn current(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }
    
    fn advance(&mut self) {
        self.pos += 1;
    }
    
    fn parse_expression(&mut self) -> Result<Expr, String> {
        self.parse_binary_expr(0)
    }
    
    fn parse_binary_expr(&mut self, min_precedence: u8) -> Result<Expr, String> {
        let mut left = self.parse_unary()?;
        
        while let Some(token) = self.current() {
            let (op, precedence, right_assoc) = match token {
                Token::Plus => (BinaryOp::Add, 1, false),
                Token::Minus => (BinaryOp::Sub, 1, false),
                Token::Star => (BinaryOp::Mul, 2, false),
                Token::Slash => (BinaryOp::Div, 2, false),
                Token::Percent => (BinaryOp::Mod, 2, false),
                Token::StarStar => (BinaryOp::Pow, 3, true),
                _ => break,
            };
            
            if precedence < min_precedence {
                break;
            }
            
            self.advance();
            
            let next_min_precedence = if right_assoc {
                precedence
            } else {
                precedence + 1
            };
            
            let right = self.parse_binary_expr(next_min_precedence)?;
            
            left = Expr::BinaryOp {
                left: Box::new(left),
                op,
                right: Box::new(right),
            };
        }
        
        Ok(left)
    }
    
    fn parse_unary(&mut self) -> Result<Expr, String> {
        if let Some(Token::Minus) = self.current() {
            self.advance();
            let expr = self.parse_unary()?;
            Ok(Expr::UnaryMinus(Box::new(expr)))
        } else {
            self.parse_primary()
        }
    }
    
    fn parse_primary(&mut self) -> Result<Expr, String> {
        match self.current() {
            Some(Token::Number(n)) => {
                let num = *n;
                self.advance();
                Ok(Expr::Number(num))
            }
            Some(Token::LParen) => {
                self.advance();
                let expr = self.parse_expression()?;
                
                match self.current() {
                    Some(Token::RParen) => {
                        self.advance();
                        Ok(expr)
                    }
                    Some(_) => Err("Expected closing parenthesis".to_string()),
                    None => Err("Unmatched parentheses".to_string()),
                }
            }
            Some(token) => Err(format!("Unexpected token: {:?}", token)),
            None => Err("Unexpected end of expression".to_string()),
        }
    }
}

/// Parses tokens into an expression tree.
fn parse(tokens: Vec<Token>) -> Result<Expr, String> {
    if tokens.is_empty() {
        return Err("Empty expression".to_string());
    }
    
    let mut parser = Parser::new(tokens);
    let expr = parser.parse_expression()?;
    
    if parser.current().is_some() {
        return Err("Unexpected token after expression".to_string());
    }
    
    Ok(expr)
}

/// Evaluates an expression tree to a numeric result.
fn eval(expr: &Expr) -> Result<f64, String> {
    match expr {
        Expr::Number(n) => Ok(*n),
        Expr::UnaryMinus(e) => {
            let val = eval(e)?;
            Ok(-val)
        }
        Expr::BinaryOp { left, op, right } => {
            let left_val = eval(left)?;
            let right_val = eval(right)?;
            
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

#[cfg(test)]
mod tests {
    use super::*;
    
    // Basic arithmetic tests
    #[test]
    fn test_addition() {
        assert_eq!(calc("2 + 3").unwrap(), 5.0);
        assert_eq!(calc("1 + 2 + 3").unwrap(), 6.0);
    }
    
    #[test]
    fn test_subtraction() {
        assert_eq!(calc("5 - 3").unwrap(), 2.0);
        assert_eq!(calc("10 - 4 - 2").unwrap(), 4.0);
    }
    
    #[test]
    fn test_multiplication() {
        assert_eq!(calc("3 * 4").unwrap(), 12.0);
        assert_eq!(calc("2 * 3 * 4").unwrap(), 24.0);
    }
    
    #[test]
    fn test_division() {
        assert_eq!(calc("12 / 4").unwrap(), 3.0);
        assert_eq!(calc("20 / 4 / 2").unwrap(), 2.5);
    }
    
    #[test]
    fn test_modulo() {
        assert_eq!(calc("10 % 3").unwrap(), 1.0);
        assert_eq!(calc("17 % 5").unwrap(), 2.0);
    }
    
    #[test]
    fn test_exponentiation() {
        assert_eq!(calc("2 ** 3").unwrap(), 8.0);
        assert_eq!(calc("5 ** 2").unwrap(), 25.0);
    }
    
    // Operator precedence tests
    #[test]
    fn test_precedence_add_mul() {
        assert_eq!(calc("2 + 3 * 4").unwrap(), 14.0);
        assert_eq!(calc("3 * 4 + 2").unwrap(), 14.0);
    }
    
    #[test]
    fn test_precedence_mul_div() {
        assert_eq!(calc("12 / 3 * 2").unwrap(), 8.0);
        assert_eq!(calc("12 * 2 / 3").unwrap(), 8.0);
    }
    
    #[test]
    fn test_precedence_exp_mul() {
        assert_eq!(calc("2 * 3 ** 2").unwrap(), 18.0);
        assert_eq!(calc("3 ** 2 * 2").unwrap(), 18.0);
    }
    
    // Associativity tests
    #[test]
    fn test_left_associativity() {
        assert_eq!(calc("1 - 2 - 3").unwrap(), -4.0);
        assert_eq!(calc("16 / 4 / 2").unwrap(), 2.0);
    }
    
    #[test]
    fn test_right_associativity_exponentiation() {
        // 2 ** 3 ** 2 = 2 ** (3 ** 2) = 2 ** 9 = 512
        assert_eq!(calc("2 ** 3 ** 2").unwrap(), 512.0);
        // 2 ** 2 ** 3 = 2 ** (2 ** 3) = 2 ** 8 = 256
        assert_eq!(calc("2 ** 2 ** 3").unwrap(), 256.0);
    }
    
    // Unary negation tests
    #[test]
    fn test_unary_minus() {
        assert_eq!(calc("-5").unwrap(), -5.0);
        assert_eq!(calc("--5").unwrap(), 5.0);
        assert_eq!(calc("---5").unwrap(), -5.0);
    }
    
    #[test]
    fn test_unary_in_expression() {
        assert_eq!(calc("2 * -3").unwrap(), -6.0);
        assert_eq!(calc("-2 + 5").unwrap(), 3.0);
        assert_eq!(calc("10 / -2").unwrap(), -5.0);
    }
    
    // Parentheses tests
    #[test]
    fn test_parentheses() {
        assert_eq!(calc("(2 + 3) * 4").unwrap(), 20.0);
        assert_eq!(calc("2 * (3 + 4)").unwrap(), 14.0);
    }
    
    #[test]
    fn test_nested_parentheses() {
        assert_eq!(calc("((2 + 3) * 4)").unwrap(), 20.0);
        assert_eq!(calc("(2 * (3 + 4))").unwrap(), 14.0);
        assert_eq!(calc("((1 + 2) * (3 + 4))").unwrap(), 21.0);
    }
    
    #[test]
    fn test_parentheses_with_unary() {
        assert_eq!(calc("-(2 + 3)").unwrap(), -5.0);
        assert_eq!(calc("(-2 + 3)").unwrap(), 1.0);
    }
    
    // Decimal number tests
    #[test]
    fn test_decimal_numbers() {
        assert_eq!(calc("3.14 + 2.86").unwrap(), 6.0);
        assert_eq!(calc("0.5 * 4").unwrap(), 2.0);
    }
    
    #[test]
    fn test_leading_decimal() {
        assert_eq!(calc(".5 + .5").unwrap(), 1.0);
        assert_eq!(calc(".25 * 4").unwrap(), 1.0);
    }
    
    // Complex expression tests
    #[test]
    fn test_complex_expression() {
        assert_eq!(calc("2 + 3 * (4 - 1)").unwrap(), 11.0);
        assert_eq!(calc("(5 + 3) * 2 - 4 / 2").unwrap(), 14.0);
    }
    
    #[test]
    fn test_complex_with_exponentiation() {
        assert_eq!(calc("2 ** 3 + 4").unwrap(), 12.0);
        assert_eq!(calc("(2 + 3) ** 2").unwrap(), 25.0);
    }
    
    // Whitespace tests
    #[test]
    fn test_whitespace() {
        assert_eq!(calc("  2  +  3  ").unwrap(), 5.0);
        assert_eq!(calc("2+3").unwrap(), 5.0);
        assert_eq!(calc("\t2\n+\r3").unwrap(), 5.0);
    }
    
    // Error handling tests
    #[test]
    fn test_empty_input() {
        assert!(calc("").is_err());
        assert!(calc("   ").is_err());
    }
    
    #[test]
    fn test_division_by_zero() {
        assert!(calc("5 / 0").is_err());
        assert!(calc("10 / (2 - 2)").is_err());
    }
    
    #[test]
    fn test_modulo_by_zero() {
        assert!(calc("5 % 0").is_err());
        assert!(calc("10 % (3 - 3)").is_err());
    }
    
    #[test]
    fn test_unmatched_parentheses() {
        assert!(calc("(2 + 3").is_err());
        assert!(calc("2 + 3)").is_err());
        assert!(calc("((2 + 3)").is_err());
    }
    
    #[test]
    fn test_invalid_characters() {
        assert!(calc("2 & 3").is_err());
        assert!(calc("2 + $").is_err());
        assert!(calc("abc").is_err());
    }
    
    #[test]
    fn test_malformed_expressions() {
        assert!(calc("2 +").is_err());
        assert!(calc("* 3").is_err());
        assert!(calc("2 + + 3").is_err());
        assert!(calc("2 3").is_err());
    }
    
    #[test]
    fn test_trailing_operator() {
        assert!(calc("2 + 3 *").is_err());
        assert!(calc("5 /").is_err());
    }
}
