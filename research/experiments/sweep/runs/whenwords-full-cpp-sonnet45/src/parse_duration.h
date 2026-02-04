#ifndef PARSE_DURATION_H
#define PARSE_DURATION_H

#include <string>
#include <cstdint>

/**
 * Parses a human-written duration string into total seconds.
 *
 * @param input A duration string in any supported format
 * @return The total number of seconds (integer, rounded)
 * @throws std::invalid_argument if the input is invalid
 */
int64_t parseDuration(const std::string& input);

#endif // PARSE_DURATION_H
