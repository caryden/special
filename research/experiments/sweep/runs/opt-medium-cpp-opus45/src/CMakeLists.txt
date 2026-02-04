cmake_minimum_required(VERSION 3.14)
project(opt_medium_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

enable_testing()

# All tests are header-only, just compile test files
set(TEST_SOURCES
    test_vec_ops
    test_result_types
    test_line_search
    test_finite_diff
    test_bfgs
)

foreach(TEST_NAME ${TEST_SOURCES})
    add_executable(${TEST_NAME} ${TEST_NAME}.cpp)
    target_include_directories(${TEST_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
    add_test(NAME ${TEST_NAME} COMMAND ${TEST_NAME})
endforeach()
