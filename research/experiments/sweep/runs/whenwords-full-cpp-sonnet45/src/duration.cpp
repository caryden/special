#include "duration.h"
#include <stdexcept>
#include <vector>
#include <cmath>

struct Unit {
    int64_t seconds;
    const char* singularVerbose;
    const char* pluralVerbose;
    const char* compact;
};

std::string duration(int64_t seconds, const DurationOptions& options) {
    if (seconds < 0) {
        throw std::invalid_argument("Seconds must not be negative");
    }

    static const std::vector<Unit> units = {
        {31536000, "year", "years", "y"},
        {2592000, "month", "months", "mo"},
        {86400, "day", "days", "d"},
        {3600, "hour", "hours", "h"},
        {60, "minute", "minutes", "m"},
        {1, "second", "seconds", "s"}
    };

    if (seconds == 0) {
        return options.compact ? "0s" : "0 seconds";
    }

    std::vector<std::string> parts;
    int64_t remaining = seconds;

    for (size_t i = 0; i < units.size() && parts.size() < static_cast<size_t>(options.maxUnits); ++i) {
        const auto& unit = units[i];

        if (remaining >= unit.seconds) {
            int64_t count;

            // If this is the last slot, round instead of floor
            if (parts.size() + 1 >= static_cast<size_t>(options.maxUnits)) {
                count = std::round(static_cast<double>(remaining) / unit.seconds);
                remaining = 0; // Consumed all remaining
            } else {
                count = remaining / unit.seconds;
                remaining = remaining % unit.seconds;
            }

            // Format the part
            std::string part;
            if (options.compact) {
                part = std::to_string(count) + unit.compact;
            } else {
                part = std::to_string(count) + " ";
                part += (count == 1) ? unit.singularVerbose : unit.pluralVerbose;
            }

            parts.push_back(part);
        }
    }

    // Join parts
    std::string result;
    const char* separator = options.compact ? " " : ", ";

    for (size_t i = 0; i < parts.size(); ++i) {
        if (i > 0) {
            result += separator;
        }
        result += parts[i];
    }

    return result;
}
