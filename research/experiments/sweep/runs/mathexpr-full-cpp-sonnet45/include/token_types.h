#pragma once
#include <string>

enum class TokenKind {
    Number,
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Power,
    LParen,
    RParen
};

struct Token {
    TokenKind kind;
    std::string value;
};

Token token(TokenKind kind, const std::string& value);
