cmake_minimum_required(VERSION 3.14)
project(OptimizationMedium CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(include)

# Library with all implementation files
add_library(optimization
    src/vec_ops.cpp
    src/result_types.cpp
    src/line_search.cpp
    src/finite_diff.cpp
    src/bfgs.cpp
)

# Test executable
add_executable(tests
    tests/test_main.cpp
    tests/vec_ops_test.cpp
    tests/result_types_test.cpp
    tests/line_search_test.cpp
    tests/finite_diff_test.cpp
    tests/bfgs_test.cpp
)

target_link_libraries(tests optimization)

# Enable testing
enable_testing()
add_test(NAME all_tests COMMAND tests)
