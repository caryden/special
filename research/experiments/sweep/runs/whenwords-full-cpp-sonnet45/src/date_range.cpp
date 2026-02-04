#include "date_range.h"
#include <algorithm>

static const char* monthNames[] = {
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
};

struct DateParts {
    int year;
    int month;  // 1-12
    int day;    // 1-31
};

static DateParts getUTCDateParts(int64_t epochSeconds) {
    auto days = epochSeconds / 86400;

    // Calculate date from days since epoch
    int64_t z = days + 719468; // Days from 0000-03-01 to 1970-01-01
    int64_t era = (z >= 0 ? z : z - 146096) / 146097;
    int64_t doe = z - era * 146097;
    int64_t yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    int64_t y = yoe + era * 400;
    int64_t doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    int64_t mp = (5 * doy + 2) / 153;

    DateParts parts;
    parts.day = doy - (153 * mp + 2) / 5 + 1;
    parts.month = mp + (mp < 10 ? 3 : -9);
    parts.year = y + (parts.month <= 2);

    return parts;
}

std::string dateRange(int64_t start, int64_t end) {
    // Auto-swap if needed
    if (start > end) {
        std::swap(start, end);
    }

    DateParts startParts = getUTCDateParts(start);
    DateParts endParts = getUTCDateParts(end);

    const char* startMonth = monthNames[startParts.month - 1];
    const char* endMonth = monthNames[endParts.month - 1];

    // Same day
    if (startParts.year == endParts.year &&
        startParts.month == endParts.month &&
        startParts.day == endParts.day) {
        return std::string(startMonth) + " " + std::to_string(startParts.day) + ", " +
               std::to_string(startParts.year);
    }

    // Same month & year
    if (startParts.year == endParts.year && startParts.month == endParts.month) {
        return std::string(startMonth) + " " + std::to_string(startParts.day) +
               "\u2013" + std::to_string(endParts.day) + ", " +
               std::to_string(startParts.year);
    }

    // Same year, different month
    if (startParts.year == endParts.year) {
        return std::string(startMonth) + " " + std::to_string(startParts.day) +
               " \u2013 " + std::string(endMonth) + " " + std::to_string(endParts.day) + ", " +
               std::to_string(startParts.year);
    }

    // Different years
    return std::string(startMonth) + " " + std::to_string(startParts.day) + ", " +
           std::to_string(startParts.year) +
           " \u2013 " +
           std::string(endMonth) + " " + std::to_string(endParts.day) + ", " +
           std::to_string(endParts.year);
}
