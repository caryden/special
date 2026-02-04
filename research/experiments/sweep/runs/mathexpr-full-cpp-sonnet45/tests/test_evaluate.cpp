#include "doctest.h"
#include "evaluate.h"

TEST_CASE("evaluate: basic operations") {
    CHECK(calc("1 + 2") == 3);
    CHECK(calc("10 - 3") == 7);
    CHECK(calc("4 * 5") == 20);
    CHECK(calc("15 / 4") == doctest::Approx(3.75));
    CHECK(calc("10 % 3") == doctest::Approx(1));
    CHECK(calc("2 ** 8") == 256);
}

TEST_CASE("evaluate: operator precedence") {
    CHECK(calc("2 + 3 * 4") == 14);
    CHECK(calc("2 * 3 + 4") == 10);
    CHECK(calc("10 - 2 * 3") == 4);
    CHECK(calc("2 + 3 ** 2") == 11);
    CHECK(calc("2 * 3 ** 2") == 18);
    CHECK(calc("2 ** 3 * 4") == 32);
}

TEST_CASE("evaluate: parentheses") {
    CHECK(calc("(2 + 3) * 4") == 20);
    CHECK(calc("2 * (3 + 4)") == 14);
    CHECK(calc("(2 + 3) * (4 + 5)") == 45);
    CHECK(calc("((1 + 2) * (3 + 4))") == 21);
    CHECK(calc("(10)") == 10);
}

TEST_CASE("evaluate: associativity") {
    SUBCASE("left-associative subtraction") {
        CHECK(calc("1 - 2 - 3") == -4);
    }

    SUBCASE("left-associative mixed") {
        CHECK(calc("1 - 2 + 3") == 2);
    }

    SUBCASE("left-associative division") {
        CHECK(calc("12 / 3 / 2") == 2);
    }

    SUBCASE("right-associative power") {
        CHECK(calc("2 ** 3 ** 2") == 512);
    }
}

TEST_CASE("evaluate: unary minus") {
    CHECK(calc("-5") == -5);
    CHECK(calc("--5") == 5);
    CHECK(calc("-(-5)") == 5);
    CHECK(calc("2 * -3") == -6);
    CHECK(calc("-2 ** 2") == 4);
    CHECK(calc("-(2 ** 2)") == -4);
}

TEST_CASE("evaluate: decimal numbers") {
    CHECK(calc("3.14 * 2") == doctest::Approx(6.28));
    CHECK(calc(".5 + .5") == doctest::Approx(1));
}

TEST_CASE("evaluate: complex expressions") {
    CHECK(calc("2 + 3 * 4 - 1") == 13);
    CHECK(calc("(2 + 3) * (4 - 1) / 5") == 3);
    CHECK(calc("10 % 3 + 2 ** 3") == 9);
    CHECK(calc("2 ** (1 + 2)") == 8);
    CHECK(calc("100 / 10 / 2 + 3") == 8);
}

TEST_CASE("evaluate: error cases") {
    SUBCASE("empty expression") {
        CHECK_THROWS_WITH_AS(calc(""), "Empty expression", std::runtime_error);
    }

    SUBCASE("whitespace only") {
        CHECK_THROWS_WITH_AS(calc("   "), "Empty expression", std::runtime_error);
    }

    SUBCASE("division by zero") {
        CHECK_THROWS_WITH_AS(calc("1 / 0"), "Division by zero", std::runtime_error);
    }

    SUBCASE("modulo by zero") {
        CHECK_THROWS_WITH_AS(calc("5 % 0"), "Modulo by zero", std::runtime_error);
    }

    SUBCASE("missing closing paren") {
        CHECK_THROWS_WITH_AS(calc("(2 + 3"), "Expected rparen", std::runtime_error);
    }

    SUBCASE("invalid character") {
        CHECK_THROWS_AS(calc("2 @ 3"), std::runtime_error);
    }

    SUBCASE("incomplete expression") {
        CHECK_THROWS_WITH_AS(calc("2 +"), "Unexpected end of input", std::runtime_error);
    }
}
