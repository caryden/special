#include "ast_types.h"

std::shared_ptr<AstNode> numberLiteral(double value) {
    return std::make_shared<NumberLiteral>(value);
}

std::shared_ptr<AstNode> unaryExpr(const std::string& op, std::shared_ptr<AstNode> operand) {
    return std::make_shared<UnaryExpr>(op, operand);
}

std::shared_ptr<AstNode> binaryExpr(const std::string& op, std::shared_ptr<AstNode> left, std::shared_ptr<AstNode> right) {
    return std::make_shared<BinaryExpr>(op, left, right);
}
