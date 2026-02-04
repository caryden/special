#include "doctest.h"
#include "tokenizer.h"

TEST_CASE("tokenizer: basic cases") {
    SUBCASE("empty string") {
        auto tokens = tokenize("");
        CHECK(tokens.empty());
    }

    SUBCASE("whitespace only") {
        auto tokens = tokenize("   \t\n  ");
        CHECK(tokens.empty());
    }

    SUBCASE("single number") {
        auto tokens = tokenize("42");
        REQUIRE(tokens.size() == 1);
        CHECK(tokens[0].kind == TokenKind::Number);
        CHECK(tokens[0].value == "42");
    }

    SUBCASE("decimal number") {
        auto tokens = tokenize("3.14");
        REQUIRE(tokens.size() == 1);
        CHECK(tokens[0].kind == TokenKind::Number);
        CHECK(tokens[0].value == "3.14");
    }

    SUBCASE("number starting with decimal") {
        auto tokens = tokenize(".5");
        REQUIRE(tokens.size() == 1);
        CHECK(tokens[0].kind == TokenKind::Number);
        CHECK(tokens[0].value == ".5");
    }
}

TEST_CASE("tokenizer: operators") {
    SUBCASE("all operators with spaces") {
        auto tokens = tokenize("+ - * / % **");
        REQUIRE(tokens.size() == 6);
        CHECK(tokens[0].kind == TokenKind::Plus);
        CHECK(tokens[0].value == "+");
        CHECK(tokens[1].kind == TokenKind::Minus);
        CHECK(tokens[1].value == "-");
        CHECK(tokens[2].kind == TokenKind::Star);
        CHECK(tokens[2].value == "*");
        CHECK(tokens[3].kind == TokenKind::Slash);
        CHECK(tokens[3].value == "/");
        CHECK(tokens[4].kind == TokenKind::Percent);
        CHECK(tokens[4].value == "%");
        CHECK(tokens[5].kind == TokenKind::Power);
        CHECK(tokens[5].value == "**");
    }
}

TEST_CASE("tokenizer: parentheses") {
    SUBCASE("simple parentheses") {
        auto tokens = tokenize("(1)");
        REQUIRE(tokens.size() == 3);
        CHECK(tokens[0].kind == TokenKind::LParen);
        CHECK(tokens[1].kind == TokenKind::Number);
        CHECK(tokens[2].kind == TokenKind::RParen);
    }
}

TEST_CASE("tokenizer: complex expressions") {
    SUBCASE("expression with all operator types") {
        auto tokens = tokenize("2 + 3 * (4 - 1)");
        REQUIRE(tokens.size() == 9);
        CHECK(tokens[0].kind == TokenKind::Number);
        CHECK(tokens[0].value == "2");
        CHECK(tokens[1].kind == TokenKind::Plus);
        CHECK(tokens[2].kind == TokenKind::Number);
        CHECK(tokens[2].value == "3");
        CHECK(tokens[3].kind == TokenKind::Star);
        CHECK(tokens[4].kind == TokenKind::LParen);
        CHECK(tokens[5].kind == TokenKind::Number);
        CHECK(tokens[5].value == "4");
        CHECK(tokens[6].kind == TokenKind::Minus);
        CHECK(tokens[7].kind == TokenKind::Number);
        CHECK(tokens[7].value == "1");
        CHECK(tokens[8].kind == TokenKind::RParen);
    }

    SUBCASE("power and multiplication together") {
        auto tokens = tokenize("2**3*4");
        REQUIRE(tokens.size() == 5);
        CHECK(tokens[0].value == "2");
        CHECK(tokens[1].kind == TokenKind::Power);
        CHECK(tokens[2].value == "3");
        CHECK(tokens[3].kind == TokenKind::Star);
        CHECK(tokens[4].value == "4");
    }

    SUBCASE("no spaces") {
        auto tokens = tokenize("1+2");
        REQUIRE(tokens.size() == 3);
        CHECK(tokens[0].value == "1");
        CHECK(tokens[1].kind == TokenKind::Plus);
        CHECK(tokens[2].value == "2");
    }
}

TEST_CASE("tokenizer: error cases") {
    SUBCASE("double decimal point") {
        CHECK_THROWS_WITH_AS(tokenize("1.2.3"), "Unexpected character '.'", std::runtime_error);
    }

    SUBCASE("invalid character") {
        CHECK_THROWS_WITH_AS(tokenize("2 @ 3"), "Unexpected character '@' at position 2", std::runtime_error);
    }
}
