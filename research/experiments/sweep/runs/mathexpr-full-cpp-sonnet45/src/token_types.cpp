#include "token_types.h"

Token token(TokenKind kind, const std::string& value) {
    return Token{kind, value};
}
