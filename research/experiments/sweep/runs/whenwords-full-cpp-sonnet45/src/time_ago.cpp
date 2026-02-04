#include "time_ago.h"
#include <cmath>
#include <vector>

struct Threshold {
    int64_t maxSeconds;
    const char* singularLabel;
    const char* pluralLabel;
    int64_t divisor;
};

std::string timeAgo(int64_t timestamp, int64_t reference) {
    int64_t diff = reference - timestamp;
    int64_t seconds = std::abs(diff);
    bool isFuture = timestamp > reference;

    // Threshold table
    static const std::vector<Threshold> thresholds = {
        {44, "just now", "just now", 1},
        {89, "1 minute ago", "in 1 minute", 1},
        {2640, "minutes ago", "in N minutes", 60},
        {5340, "1 hour ago", "in 1 hour", 1},
        {75600, "hours ago", "in N hours", 3600},
        {126000, "1 day ago", "in 1 day", 1},
        {2160000, "days ago", "in N days", 86400},
        {3888000, "1 month ago", "in 1 month", 1},
        {27561600, "months ago", "in N months", 2592000},
        {47260800, "1 year ago", "in 1 year", 1},
        {INT64_MAX, "years ago", "in N years", 31536000}
    };

    for (const auto& threshold : thresholds) {
        if (seconds <= threshold.maxSeconds) {
            const char* label = isFuture ? threshold.pluralLabel : threshold.singularLabel;

            // "just now" is direction-neutral
            if (threshold.divisor == 1 && threshold.maxSeconds == 44) {
                return "just now";
            }

            // Fixed singular labels (divisor == 1)
            if (threshold.divisor == 1) {
                return label;
            }

            // Compute N and format
            int64_t n = std::round(static_cast<double>(seconds) / threshold.divisor);

            if (n == 1) {
                // Use singular form
                if (isFuture) {
                    if (threshold.divisor == 60) return "in 1 minute";
                    if (threshold.divisor == 3600) return "in 1 hour";
                    if (threshold.divisor == 86400) return "in 1 day";
                    if (threshold.divisor == 2592000) return "in 1 month";
                    if (threshold.divisor == 31536000) return "in 1 year";
                } else {
                    if (threshold.divisor == 60) return "1 minute ago";
                    if (threshold.divisor == 3600) return "1 hour ago";
                    if (threshold.divisor == 86400) return "1 day ago";
                    if (threshold.divisor == 2592000) return "1 month ago";
                    if (threshold.divisor == 31536000) return "1 year ago";
                }
            }

            // Plural form
            if (isFuture) {
                if (threshold.divisor == 60) return "in " + std::to_string(n) + " minutes";
                if (threshold.divisor == 3600) return "in " + std::to_string(n) + " hours";
                if (threshold.divisor == 86400) return "in " + std::to_string(n) + " days";
                if (threshold.divisor == 2592000) return "in " + std::to_string(n) + " months";
                if (threshold.divisor == 31536000) return "in " + std::to_string(n) + " years";
            } else {
                if (threshold.divisor == 60) return std::to_string(n) + " minutes ago";
                if (threshold.divisor == 3600) return std::to_string(n) + " hours ago";
                if (threshold.divisor == 86400) return std::to_string(n) + " days ago";
                if (threshold.divisor == 2592000) return std::to_string(n) + " months ago";
                if (threshold.divisor == 31536000) return std::to_string(n) + " years ago";
            }
        }
    }

    return "";
}
