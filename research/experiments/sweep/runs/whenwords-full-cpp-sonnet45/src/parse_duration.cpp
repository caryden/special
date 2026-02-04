#include "parse_duration.h"
#include <regex>
#include <map>
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <cmath>

static std::string trim(const std::string& str) {
    size_t start = 0;
    while (start < str.length() && std::isspace(str[start])) {
        ++start;
    }
    size_t end = str.length();
    while (end > start && std::isspace(str[end - 1])) {
        --end;
    }
    return str.substr(start, end - start);
}

static std::string toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
}

static const std::map<std::string, int64_t> unitAliases = {
    {"y", 31536000}, {"yr", 31536000}, {"yrs", 31536000}, {"year", 31536000}, {"years", 31536000},
    {"mo", 2592000}, {"month", 2592000}, {"months", 2592000},
    {"w", 604800}, {"wk", 604800}, {"wks", 604800}, {"week", 604800}, {"weeks", 604800},
    {"d", 86400}, {"day", 86400}, {"days", 86400},
    {"h", 3600}, {"hr", 3600}, {"hrs", 3600}, {"hour", 3600}, {"hours", 3600},
    {"m", 60}, {"min", 60}, {"mins", 60}, {"minute", 60}, {"minutes", 60},
    {"s", 1}, {"sec", 1}, {"secs", 1}, {"second", 1}, {"seconds", 1}
};

int64_t parseDuration(const std::string& input) {
    std::string trimmed = trim(input);

    if (trimmed.empty()) {
        throw std::invalid_argument("Empty string");
    }

    if (trimmed[0] == '-') {
        throw std::invalid_argument("Negative duration");
    }

    // Try colon notation first
    std::regex colonPattern(R"(^(\d+):(\d{1,2})(?::(\d{1,2}))?$)");
    std::smatch colonMatch;
    if (std::regex_match(trimmed, colonMatch, colonPattern)) {
        int64_t hours = std::stoll(colonMatch[1].str());
        int64_t minutes = std::stoll(colonMatch[2].str());
        int64_t seconds = colonMatch[3].matched ? std::stoll(colonMatch[3].str()) : 0;
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Normalize: lowercase, replace commas with spaces, remove "and", collapse whitespace
    std::string normalized = toLower(trimmed);

    // Replace commas with spaces
    std::replace(normalized.begin(), normalized.end(), ',', ' ');

    // Remove "and"
    size_t pos = 0;
    while ((pos = normalized.find("and", pos)) != std::string::npos) {
        normalized.replace(pos, 3, " ");
    }

    // Collapse multiple spaces
    std::regex multiSpace(R"(\s+)");
    normalized = std::regex_replace(normalized, multiSpace, " ");
    normalized = trim(normalized);

    // Match all number+unit pairs
    std::regex pairPattern(R"((\d+(?:\.\d+)?)\s*([a-z]+))");
    std::sregex_iterator iter(normalized.begin(), normalized.end(), pairPattern);
    std::sregex_iterator end;

    double totalSeconds = 0.0;
    bool foundAny = false;

    for (; iter != end; ++iter) {
        foundAny = true;
        double value = std::stod((*iter)[1].str());
        std::string unit = (*iter)[2].str();

        auto it = unitAliases.find(unit);
        if (it == unitAliases.end()) {
            throw std::invalid_argument("Unrecognized unit name");
        }

        totalSeconds += value * it->second;
    }

    if (!foundAny) {
        throw std::invalid_argument("No recognized number+unit pairs");
    }

    return std::round(totalSeconds);
}
