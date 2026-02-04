#ifndef DATE_RANGE_H
#define DATE_RANGE_H

#include <string>
#include <cstdint>

/**
 * Formats two timestamps as a smart date range, collapsing redundant information.
 *
 * @param start Unix epoch seconds (range start)
 * @param end Unix epoch seconds (range end)
 * @return A formatted date range string (auto-swaps if start > end)
 */
std::string dateRange(int64_t start, int64_t end);

#endif // DATE_RANGE_H
