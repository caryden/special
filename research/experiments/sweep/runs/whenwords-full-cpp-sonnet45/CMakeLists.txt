cmake_minimum_required(VERSION 3.17)
project(whenwords CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include src)

# Library
add_library(whenwords
    src/time_ago.cpp
    src/duration.cpp
    src/parse_duration.cpp
    src/human_date.cpp
    src/date_range.cpp
)

# Test executable
add_executable(whenwords_test
    tests/test_main.cpp
    tests/time_ago_test.cpp
    tests/duration_test.cpp
    tests/parse_duration_test.cpp
    tests/human_date_test.cpp
    tests/date_range_test.cpp
)

target_link_libraries(whenwords_test whenwords)

enable_testing()
add_test(NAME whenwords_test COMMAND whenwords_test)
