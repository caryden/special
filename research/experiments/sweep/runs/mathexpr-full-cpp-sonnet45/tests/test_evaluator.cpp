#include "doctest.h"
#include "evaluator.h"

TEST_CASE("evaluator: number literals") {
    SUBCASE("integer") {
        auto node = numberLiteral(42);
        CHECK(evaluate(node) == 42);
    }

    SUBCASE("decimal") {
        auto node = numberLiteral(3.14);
        CHECK(evaluate(node) == doctest::Approx(3.14));
    }
}

TEST_CASE("evaluator: unary expressions") {
    SUBCASE("single negation") {
        auto node = unaryExpr("-", numberLiteral(5));
        CHECK(evaluate(node) == -5);
    }

    SUBCASE("double negation") {
        auto inner = unaryExpr("-", numberLiteral(7));
        auto outer = unaryExpr("-", inner);
        CHECK(evaluate(outer) == 7);
    }
}

TEST_CASE("evaluator: binary expressions") {
    SUBCASE("addition") {
        auto node = binaryExpr("+", numberLiteral(2), numberLiteral(3));
        CHECK(evaluate(node) == 5);
    }

    SUBCASE("subtraction") {
        auto node = binaryExpr("-", numberLiteral(10), numberLiteral(4));
        CHECK(evaluate(node) == 6);
    }

    SUBCASE("multiplication") {
        auto node = binaryExpr("*", numberLiteral(3), numberLiteral(7));
        CHECK(evaluate(node) == 21);
    }

    SUBCASE("division") {
        auto node = binaryExpr("/", numberLiteral(15), numberLiteral(4));
        CHECK(evaluate(node) == doctest::Approx(3.75));
    }

    SUBCASE("modulo") {
        auto node = binaryExpr("%", numberLiteral(10), numberLiteral(3));
        CHECK(evaluate(node) == doctest::Approx(1));
    }

    SUBCASE("power") {
        auto node = binaryExpr("**", numberLiteral(2), numberLiteral(8));
        CHECK(evaluate(node) == 256);
    }
}

TEST_CASE("evaluator: nested expressions") {
    SUBCASE("2 + 3 * 4 = 14") {
        auto mult = binaryExpr("*", numberLiteral(3), numberLiteral(4));
        auto add = binaryExpr("+", numberLiteral(2), mult);
        CHECK(evaluate(add) == 14);
    }
}

TEST_CASE("evaluator: error cases") {
    SUBCASE("division by zero") {
        auto node = binaryExpr("/", numberLiteral(1), numberLiteral(0));
        CHECK_THROWS_WITH_AS(evaluate(node), "Division by zero", std::runtime_error);
    }

    SUBCASE("modulo by zero") {
        auto node = binaryExpr("%", numberLiteral(5), numberLiteral(0));
        CHECK_THROWS_WITH_AS(evaluate(node), "Modulo by zero", std::runtime_error);
    }
}
