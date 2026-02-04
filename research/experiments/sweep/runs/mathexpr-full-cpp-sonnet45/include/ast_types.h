#pragma once
#include <memory>
#include <string>

enum class AstNodeType {
    Number,
    Unary,
    Binary
};

struct AstNode {
    AstNodeType type;
    virtual ~AstNode() = default;
};

struct NumberLiteral : public AstNode {
    double value;
    NumberLiteral(double v) : value(v) {
        type = AstNodeType::Number;
    }
};

struct UnaryExpr : public AstNode {
    std::string op;
    std::shared_ptr<AstNode> operand;
    UnaryExpr(const std::string& o, std::shared_ptr<AstNode> operandNode)
        : op(o), operand(operandNode) {
        type = AstNodeType::Unary;
    }
};

struct BinaryExpr : public AstNode {
    std::string op;
    std::shared_ptr<AstNode> left;
    std::shared_ptr<AstNode> right;
    BinaryExpr(const std::string& o, std::shared_ptr<AstNode> l, std::shared_ptr<AstNode> r)
        : op(o), left(l), right(r) {
        type = AstNodeType::Binary;
    }
};

std::shared_ptr<AstNode> numberLiteral(double value);
std::shared_ptr<AstNode> unaryExpr(const std::string& op, std::shared_ptr<AstNode> operand);
std::shared_ptr<AstNode> binaryExpr(const std::string& op, std::shared_ptr<AstNode> left, std::shared_ptr<AstNode> right);
