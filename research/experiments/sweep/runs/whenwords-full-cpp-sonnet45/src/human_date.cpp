#include "human_date.h"
#include <chrono>
#include <cmath>

static const char* dayNames[] = {
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
};

static const char* monthNames[] = {
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
};

struct DateParts {
    int year;
    int month;  // 1-12
    int day;    // 1-31
    int weekday; // 0-6 (Sunday = 0)
};

static DateParts getUTCDateParts(int64_t epochSeconds) {
    auto tp = std::chrono::system_clock::from_time_t(epochSeconds);
    auto days = std::chrono::duration_cast<std::chrono::hours>(tp.time_since_epoch()).count() / 24;

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

    // Calculate weekday (0 = Sunday)
    int64_t weekday = (days + 4) % 7;
    if (weekday < 0) weekday += 7;
    parts.weekday = weekday;

    return parts;
}

static int64_t getDaysSinceEpoch(int64_t epochSeconds) {
    return epochSeconds / 86400;
}

std::string humanDate(int64_t timestamp, int64_t reference) {
    DateParts tsParts = getUTCDateParts(timestamp);
    DateParts refParts = getUTCDateParts(reference);

    int64_t tsDays = getDaysSinceEpoch(timestamp);
    int64_t refDays = getDaysSinceEpoch(reference);
    int dayDiff = tsDays - refDays;

    // Today
    if (dayDiff == 0) {
        return "Today";
    }

    // Yesterday
    if (dayDiff == -1) {
        return "Yesterday";
    }

    // Tomorrow
    if (dayDiff == 1) {
        return "Tomorrow";
    }

    // Last [Day] (2-6 days ago)
    if (dayDiff >= -6 && dayDiff <= -2) {
        return std::string("Last ") + dayNames[tsParts.weekday];
    }

    // This [Day] (2-6 days in future)
    if (dayDiff >= 2 && dayDiff <= 6) {
        return std::string("This ") + dayNames[tsParts.weekday];
    }

    // Same year: "Month Day"
    if (tsParts.year == refParts.year) {
        return std::string(monthNames[tsParts.month - 1]) + " " + std::to_string(tsParts.day);
    }

    // Different year: "Month Day, Year"
    return std::string(monthNames[tsParts.month - 1]) + " " +
           std::to_string(tsParts.day) + ", " + std::to_string(tsParts.year);
}
