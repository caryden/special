#include "evaluator.h"
#include <stdexcept>
#include <cmath>

double evaluate(std::shared_ptr<AstNode> node) {
    if (node->type == AstNodeType::Number) {
        auto numNode = std::dynamic_pointer_cast<NumberLiteral>(node);
        return numNode->value;
    }

    if (node->type == AstNodeType::Unary) {
        auto unaryNode = std::dynamic_pointer_cast<UnaryExpr>(node);
        double operandValue = evaluate(unaryNode->operand);
        if (unaryNode->op == "-") {
            return -operandValue;
        }
        throw std::runtime_error("Unknown unary operator");
    }

    if (node->type == AstNodeType::Binary) {
        auto binNode = std::dynamic_pointer_cast<BinaryExpr>(node);
        double leftValue = evaluate(binNode->left);
        double rightValue = evaluate(binNode->right);

        if (binNode->op == "+") {
            return leftValue + rightValue;
        } else if (binNode->op == "-") {
            return leftValue - rightValue;
        } else if (binNode->op == "*") {
            return leftValue * rightValue;
        } else if (binNode->op == "/") {
            if (rightValue == 0) {
                throw std::runtime_error("Division by zero");
            }
            return leftValue / rightValue;
        } else if (binNode->op == "%") {
            if (rightValue == 0) {
                throw std::runtime_error("Modulo by zero");
            }
            return std::fmod(leftValue, rightValue);
        } else if (binNode->op == "**") {
            return std::pow(leftValue, rightValue);
        }
        throw std::runtime_error("Unknown binary operator");
    }

    throw std::runtime_error("Unknown node type");
}
