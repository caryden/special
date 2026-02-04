#include "parser.h"
#include <stdexcept>

class Parser {
private:
    const std::vector<Token>& tokens;
    size_t pos;

    const Token* peek() const {
        if (pos >= tokens.size()) {
            return nullptr;
        }
        return &tokens[pos];
    }

    void consume() {
        if (pos < tokens.size()) {
            pos++;
        }
    }

    std::shared_ptr<AstNode> parseAtom() {
        const Token* token = peek();
        if (!token) {
            throw std::runtime_error("Unexpected end of input");
        }

        if (token->kind == TokenKind::Number) {
            double value = std::stod(token->value);
            consume();
            return numberLiteral(value);
        }

        if (token->kind == TokenKind::LParen) {
            consume();
            auto expr = parseAddSub();
            const Token* rparen = peek();
            if (!rparen || rparen->kind != TokenKind::RParen) {
                throw std::runtime_error("Expected rparen");
            }
            consume();
            return expr;
        }

        throw std::runtime_error("Unexpected token");
    }

    std::shared_ptr<AstNode> parseUnary() {
        const Token* token = peek();
        if (token && token->kind == TokenKind::Minus) {
            consume();
            auto operand = parseUnary();
            return unaryExpr("-", operand);
        }
        return parseAtom();
    }

    std::shared_ptr<AstNode> parsePower() {
        auto left = parseUnary();
        const Token* token = peek();
        if (token && token->kind == TokenKind::Power) {
            consume();
            auto right = parsePower();  // Right-associative: recurse same level
            return binaryExpr("**", left, right);
        }
        return left;
    }

    std::shared_ptr<AstNode> parseMulDiv() {
        auto left = parsePower();
        while (true) {
            const Token* token = peek();
            if (!token) break;

            std::string op;
            if (token->kind == TokenKind::Star) {
                op = "*";
            } else if (token->kind == TokenKind::Slash) {
                op = "/";
            } else if (token->kind == TokenKind::Percent) {
                op = "%";
            } else {
                break;
            }

            consume();
            auto right = parsePower();
            left = binaryExpr(op, left, right);
        }
        return left;
    }

    std::shared_ptr<AstNode> parseAddSub() {
        auto left = parseMulDiv();
        while (true) {
            const Token* token = peek();
            if (!token) break;

            std::string op;
            if (token->kind == TokenKind::Plus) {
                op = "+";
            } else if (token->kind == TokenKind::Minus) {
                op = "-";
            } else {
                break;
            }

            consume();
            auto right = parseMulDiv();
            left = binaryExpr(op, left, right);
        }
        return left;
    }

public:
    Parser(const std::vector<Token>& tokens) : tokens(tokens), pos(0) {}

    std::shared_ptr<AstNode> parse() {
        auto result = parseAddSub();
        if (pos < tokens.size()) {
            throw std::runtime_error("Unexpected token after expression");
        }
        return result;
    }
};

std::shared_ptr<AstNode> parse(const std::vector<Token>& tokens) {
    Parser parser(tokens);
    return parser.parse();
}
