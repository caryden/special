cmake_minimum_required(VERSION 3.14)
project(MathExpressionParser CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

enable_testing()

include_directories(include)

add_library(mathexpr
    src/token_types.cpp
    src/ast_types.cpp
    src/tokenizer.cpp
    src/parser.cpp
    src/evaluator.cpp
    src/evaluate.cpp
)

target_include_directories(mathexpr PUBLIC include)

add_executable(test_mathexpr
    tests/test_main.cpp
    tests/test_token_types.cpp
    tests/test_ast_types.cpp
    tests/test_tokenizer.cpp
    tests/test_parser.cpp
    tests/test_evaluator.cpp
    tests/test_evaluate.cpp
)

target_link_libraries(test_mathexpr mathexpr)

add_test(NAME MathExprTests COMMAND test_mathexpr)
