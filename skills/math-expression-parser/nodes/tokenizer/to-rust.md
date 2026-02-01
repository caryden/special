# tokenizer → Rust

- Take `&str` input, return `Vec<Token>`
- Use `input.chars().collect::<Vec<char>>()` or iterate with `.as_bytes()` for ASCII
- Index-based loop: `while i < chars.len()`
- `ch.is_ascii_digit()` for digit check
- Return `Result<Vec<Token>, String>` or use a custom error type
- The `**` two-character lookahead: check `i + 1 < chars.len() && chars[i + 1] == '*'`
- Leading dot numbers (`.5`) are valid — check for digit OR `.` to start a number
