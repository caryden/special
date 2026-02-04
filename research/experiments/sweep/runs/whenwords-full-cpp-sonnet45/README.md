# when-words C++ Translation

Complete translation of all 5 nodes from the when-words skill to C++17.

## Nodes Translated

1. **time-ago** - Converts Unix timestamps to relative time strings ("3 hours ago", "in 2 days")
2. **duration** - Formats seconds as human-readable durations ("2 hours, 30 minutes")
3. **parse-duration** - Parses duration strings to seconds (supports compact, verbose, colon notation)
4. **human-date** - Contextual date labels ("Today", "Yesterday", "Last Friday", "March 1")
5. **date-range** - Smart date range formatting with collapsing ("January 15–22, 2024")

## Build Instructions

```bash
# Download doctest
curl -sL https://raw.githubusercontent.com/doctest/doctest/v2.4.11/doctest/doctest.h -o include/doctest.h

# Configure and build
cmake -B build
cmake --build build

# Run tests
ctest --test-dir build --output-on-failure
```

## Test Results

- Total test cases: 14
- Total assertions: 122
- All tests passed: ✓

## Implementation Details

- **Language**: C++17
- **Test Framework**: doctest 2.4.11
- **Build System**: CMake 3.17+
- **External Dependencies**: None (zero external deps)
- **Date/Time Handling**: Manual UTC date calculations using chrono
- **Regex Support**: std::regex for parse-duration

## Key Design Decisions

1. **Pure Functions**: All functions are pure, taking Unix timestamps as input (no system clock access)
2. **UTC Only**: All date/time calculations use UTC
3. **Manual Date Math**: Used algorithmic date conversion to avoid platform-specific timezone issues
4. **En-dash Character**: Used U+2013 (–) for date ranges as specified
5. **Error Handling**: Used std::invalid_argument for error cases
6. **Half-up Rounding**: Used std::round for consistent rounding behavior

## Translation Notes

All test vectors from the specs were implemented and passed successfully. The translation follows the behavioral specifications exactly, including:

- Threshold tables for time-ago
- Rounding on last unit for duration
- Multiple format support for parse-duration
- Day difference calculations for human-date
- Auto-swap for date-range

No translation hints were used - translation was done directly from specs with TypeScript reference consulted only for clarification.
