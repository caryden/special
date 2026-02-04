cmake_minimum_required(VERSION 3.14)
project(optimization LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

enable_testing()

include_directories(${CMAKE_SOURCE_DIR}/include)

# Implementation as a library
add_library(optimization
    src/vec_ops.cpp
    src/result_types.cpp
    src/nelder_mead.cpp
)

# Test executable
add_executable(tests
    tests/test_vec_ops.cpp
    tests/test_result_types.cpp
    tests/test_nelder_mead.cpp
    tests/test_main.cpp
)
target_link_libraries(tests optimization)
add_test(NAME tests COMMAND tests)
