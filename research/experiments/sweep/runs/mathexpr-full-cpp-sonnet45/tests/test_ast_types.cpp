#include "doctest.h"
#include "ast_types.h"

TEST_CASE("ast-types: factory functions") {
    SUBCASE("numberLiteral") {
        auto node = numberLiteral(42);
        CHECK(node->type == AstNodeType::Number);
        auto numNode = std::dynamic_pointer_cast<NumberLiteral>(node);
        REQUIRE(numNode != nullptr);
        CHECK(numNode->value == 42);
    }

    SUBCASE("unaryExpr") {
        auto operand = numberLiteral(5);
        auto node = unaryExpr("-", operand);
        CHECK(node->type == AstNodeType::Unary);
        auto unaryNode = std::dynamic_pointer_cast<UnaryExpr>(node);
        REQUIRE(unaryNode != nullptr);
        CHECK(unaryNode->op == "-");
        CHECK(unaryNode->operand->type == AstNodeType::Number);
    }

    SUBCASE("binaryExpr") {
        auto left = numberLiteral(2);
        auto right = numberLiteral(3);
        auto node = binaryExpr("+", left, right);
        CHECK(node->type == AstNodeType::Binary);
        auto binNode = std::dynamic_pointer_cast<BinaryExpr>(node);
        REQUIRE(binNode != nullptr);
        CHECK(binNode->op == "+");
        CHECK(binNode->left->type == AstNodeType::Number);
        CHECK(binNode->right->type == AstNodeType::Number);
    }

    SUBCASE("nested binary expression") {
        auto innerLeft = numberLiteral(1);
        auto innerRight = numberLiteral(2);
        auto innerNode = binaryExpr("+", innerLeft, innerRight);
        auto outerRight = numberLiteral(3);
        auto outerNode = binaryExpr("*", innerNode, outerRight);

        CHECK(outerNode->type == AstNodeType::Binary);
        auto outer = std::dynamic_pointer_cast<BinaryExpr>(outerNode);
        REQUIRE(outer != nullptr);
        CHECK(outer->op == "*");
        CHECK(outer->left->type == AstNodeType::Binary);
        CHECK(outer->right->type == AstNodeType::Number);
    }
}
