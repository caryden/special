#include "tokenizer.h"
#include <stdexcept>
#include <cctype>

std::vector<Token> tokenize(const std::string& input) {
    std::vector<Token> tokens;
    size_t i = 0;

    while (i < input.size()) {
        char c = input[i];

        // Skip whitespace
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
            i++;
            continue;
        }

        // Numbers (digits or starting with '.')
        if (std::isdigit(c) || c == '.') {
            std::string num;
            bool hasDecimal = false;

            while (i < input.size()) {
                char ch = input[i];
                if (std::isdigit(ch)) {
                    num += ch;
                    i++;
                } else if (ch == '.') {
                    if (hasDecimal) {
                        throw std::runtime_error(std::string("Unexpected character '") + ch + "'");
                    }
                    hasDecimal = true;
                    num += ch;
                    i++;
                } else {
                    break;
                }
            }
            tokens.push_back(token(TokenKind::Number, num));
            continue;
        }

        // Check for ** (power)
        if (c == '*' && i + 1 < input.size() && input[i + 1] == '*') {
            tokens.push_back(token(TokenKind::Power, "**"));
            i += 2;
            continue;
        }

        // Single-character operators
        switch (c) {
            case '+':
                tokens.push_back(token(TokenKind::Plus, "+"));
                i++;
                break;
            case '-':
                tokens.push_back(token(TokenKind::Minus, "-"));
                i++;
                break;
            case '*':
                tokens.push_back(token(TokenKind::Star, "*"));
                i++;
                break;
            case '/':
                tokens.push_back(token(TokenKind::Slash, "/"));
                i++;
                break;
            case '%':
                tokens.push_back(token(TokenKind::Percent, "%"));
                i++;
                break;
            case '(':
                tokens.push_back(token(TokenKind::LParen, "("));
                i++;
                break;
            case ')':
                tokens.push_back(token(TokenKind::RParen, ")"));
                i++;
                break;
            default:
                throw std::runtime_error(std::string("Unexpected character '") + c + "' at position " + std::to_string(i));
        }
    }

    return tokens;
}
