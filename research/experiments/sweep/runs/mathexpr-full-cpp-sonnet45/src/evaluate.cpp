#include "evaluate.h"
#include "tokenizer.h"
#include "parser.h"
#include "evaluator.h"
#include <stdexcept>
#include <algorithm>

double calc(const std::string& expression) {
    // Trim the input
    std::string trimmed = expression;
    trimmed.erase(trimmed.begin(), std::find_if(trimmed.begin(), trimmed.end(), [](unsigned char ch) {
        return !std::isspace(ch);
    }));
    trimmed.erase(std::find_if(trimmed.rbegin(), trimmed.rend(), [](unsigned char ch) {
        return !std::isspace(ch);
    }).base(), trimmed.end());

    if (trimmed.empty()) {
        throw std::runtime_error("Empty expression");
    }

    auto tokens = tokenize(trimmed);
    auto ast = parse(tokens);
    return evaluate(ast);
}
