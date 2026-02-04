#include "doctest.h"
#include "token_types.h"

TEST_CASE("token-types: factory function") {
    SUBCASE("number token") {
        Token t = token(TokenKind::Number, "42");
        CHECK(t.kind == TokenKind::Number);
        CHECK(t.value == "42");
    }

    SUBCASE("plus token") {
        Token t = token(TokenKind::Plus, "+");
        CHECK(t.kind == TokenKind::Plus);
        CHECK(t.value == "+");
    }
}
