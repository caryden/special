#ifndef TIME_AGO_H
#define TIME_AGO_H

#include <string>
#include <cstdint>

/**
 * Converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".
 *
 * @param timestamp Unix epoch seconds (the event time)
 * @param reference Unix epoch seconds (the "now" time to compare against)
 * @return A human-readable relative time string
 */
std::string timeAgo(int64_t timestamp, int64_t reference);

#endif // TIME_AGO_H
