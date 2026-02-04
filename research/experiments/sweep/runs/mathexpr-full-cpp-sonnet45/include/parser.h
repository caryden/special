#pragma once
#include "token_types.h"
#include "ast_types.h"
#include <vector>

std::shared_ptr<AstNode> parse(const std::vector<Token>& tokens);
