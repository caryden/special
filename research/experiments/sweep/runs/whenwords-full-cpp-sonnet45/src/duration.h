#ifndef DURATION_H
#define DURATION_H

#include <string>
#include <cstdint>

struct DurationOptions {
    bool compact = false;
    int maxUnits = 2;
};

/**
 * Formats a number of seconds as a human-readable duration string.
 *
 * @param seconds Non-negative integer (throws on negative)
 * @param options Formatting options (compact mode and max units)
 * @return A formatted duration string
 * @throws std::invalid_argument if seconds is negative
 */
std::string duration(int64_t seconds, const DurationOptions& options = DurationOptions());

#endif // DURATION_H
