#include "doctest.h"
#include "parser.h"
#include "tokenizer.h"

TEST_CASE("parser: basic cases") {
    SUBCASE("single number") {
        auto tokens = tokenize("2");
        auto ast = parse(tokens);
        CHECK(ast->type == AstNodeType::Number);
        auto num = std::dynamic_pointer_cast<NumberLiteral>(ast);
        CHECK(num->value == 2);
    }

    SUBCASE("simple addition") {
        auto tokens = tokenize("2 + 3");
        auto ast = parse(tokens);
        CHECK(ast->type == AstNodeType::Binary);
        auto bin = std::dynamic_pointer_cast<BinaryExpr>(ast);
        CHECK(bin->op == "+");
    }

    SUBCASE("precedence: addition and multiplication") {
        auto tokens = tokenize("2 + 3 * 4");
        auto ast = parse(tokens);
        // Should be: Binary(+, Num(2), Binary(*, Num(3), Num(4)))
        CHECK(ast->type == AstNodeType::Binary);
        auto bin = std::dynamic_pointer_cast<BinaryExpr>(ast);
        CHECK(bin->op == "+");
        CHECK(bin->left->type == AstNodeType::Number);
        CHECK(bin->right->type == AstNodeType::Binary);
        auto rightBin = std::dynamic_pointer_cast<BinaryExpr>(bin->right);
        CHECK(rightBin->op == "*");
    }
}

TEST_CASE("parser: power operator (right-associative)") {
    SUBCASE("right-associativity of power") {
        auto tokens = tokenize("2 ** 3 ** 2");
        auto ast = parse(tokens);
        // Should be: Binary(**, Num(2), Binary(**, Num(3), Num(2)))
        CHECK(ast->type == AstNodeType::Binary);
        auto bin = std::dynamic_pointer_cast<BinaryExpr>(ast);
        CHECK(bin->op == "**");
        CHECK(bin->left->type == AstNodeType::Number);
        CHECK(bin->right->type == AstNodeType::Binary);
        auto rightBin = std::dynamic_pointer_cast<BinaryExpr>(bin->right);
        CHECK(rightBin->op == "**");
    }
}

TEST_CASE("parser: unary minus") {
    SUBCASE("single unary minus") {
        auto tokens = tokenize("-5");
        auto ast = parse(tokens);
        CHECK(ast->type == AstNodeType::Unary);
        auto unary = std::dynamic_pointer_cast<UnaryExpr>(ast);
        CHECK(unary->op == "-");
        CHECK(unary->operand->type == AstNodeType::Number);
    }

    SUBCASE("double unary minus") {
        auto tokens = tokenize("--5");
        auto ast = parse(tokens);
        CHECK(ast->type == AstNodeType::Unary);
        auto unary = std::dynamic_pointer_cast<UnaryExpr>(ast);
        CHECK(unary->op == "-");
        CHECK(unary->operand->type == AstNodeType::Unary);
        auto innerUnary = std::dynamic_pointer_cast<UnaryExpr>(unary->operand);
        CHECK(innerUnary->op == "-");
    }
}

TEST_CASE("parser: parentheses") {
    SUBCASE("simple parentheses") {
        auto tokens = tokenize("(2 + 3)");
        auto ast = parse(tokens);
        CHECK(ast->type == AstNodeType::Binary);
        auto bin = std::dynamic_pointer_cast<BinaryExpr>(ast);
        CHECK(bin->op == "+");
    }
}

TEST_CASE("parser: error cases") {
    SUBCASE("empty tokens") {
        std::vector<Token> tokens;
        CHECK_THROWS_WITH_AS(parse(tokens), "Unexpected end of input", std::runtime_error);
    }

    SUBCASE("incomplete expression") {
        auto tokens = tokenize("2 +");
        CHECK_THROWS_WITH_AS(parse(tokens), "Unexpected end of input", std::runtime_error);
    }

    SUBCASE("trailing tokens") {
        auto tokens = tokenize("2 3");
        CHECK_THROWS_WITH_AS(parse(tokens), "Unexpected token after expression", std::runtime_error);
    }

    SUBCASE("missing closing paren") {
        auto tokens = tokenize("(2");
        CHECK_THROWS_WITH_AS(parse(tokens), "Expected rparen", std::runtime_error);
    }
}
