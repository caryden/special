using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;

namespace WhenWords
{
    public static class WhenWords
    {
        // ============================================================================
        // time-ago: Converts a Unix timestamp to a relative time string
        // ============================================================================

        public static string TimeAgo(long timestamp, long reference)
        {
            long seconds = Math.Abs(reference - timestamp);
            bool isFuture = timestamp > reference;

            // Threshold table: [maxSeconds, singularLabel, pluralLabel, divisor]
            var thresholds = new (long max, string singular, string plural, long divisor)[]
            {
                (44, "just now", "just now", 1),
                (89, "1 minute ago", "in 1 minute", 1),
                (2640, "minutes ago", "in minutes", 60),
                (5340, "1 hour ago", "in 1 hour", 1),
                (75600, "hours ago", "in hours", 3600),
                (126000, "1 day ago", "in 1 day", 1),
                (2160000, "days ago", "in days", 86400),
                (3888000, "1 month ago", "in 1 month", 1),
                (27561600, "months ago", "in months", 2592000),
                (47260800, "1 year ago", "in 1 year", 1),
                (long.MaxValue, "years ago", "in years", 31536000)
            };

            foreach (var (max, singular, plural, divisor) in thresholds)
            {
                if (seconds <= max)
                {
                    if (singular == "just now")
                        return "just now";

                    if (divisor == 1)
                        return isFuture ? plural : singular;

                    long n = (long)Math.Round((double)seconds / divisor, MidpointRounding.AwayFromZero);

                    if (n == 1)
                    {
                        string unit = (isFuture ? plural : singular).Replace("ago", "").Replace("in ", "").Trim();
                        return isFuture ? $"in 1 {unit}" : $"1 {unit} ago";
                    }
                    else
                    {
                        string unit = (isFuture ? plural : singular).Replace("ago", "").Replace("in ", "").Trim();
                        return isFuture ? $"in {n} {unit}" : $"{n} {unit} ago";
                    }
                }
            }

            return ""; // Unreachable
        }

        // ============================================================================
        // duration: Formats seconds as a human-readable duration string
        // ============================================================================

        public class DurationOptions
        {
            public bool Compact { get; set; } = false;
            public int MaxUnits { get; set; } = 2;
        }

        public static string Duration(long seconds, DurationOptions? options = null)
        {
            if (seconds < 0)
                throw new ArgumentException("Seconds must not be negative");

            options ??= new DurationOptions();

            if (seconds == 0)
                return options.Compact ? "0s" : "0 seconds";

            var units = new (long size, string singular, string plural, string compact)[]
            {
                (31536000, "year", "years", "y"),
                (2592000, "month", "months", "mo"),
                (86400, "day", "days", "d"),
                (3600, "hour", "hours", "h"),
                (60, "minute", "minutes", "m"),
                (1, "second", "seconds", "s")
            };

            var parts = new List<string>();
            long remaining = seconds;

            for (int i = 0; i < units.Length; i++)
            {
                var (size, singular, plural, compact) = units[i];

                if (remaining >= size)
                {
                    long count;

                    // If this is the last unit slot, round instead of floor
                    if (parts.Count + 1 >= options.MaxUnits)
                    {
                        count = (long)Math.Round((double)remaining / size, MidpointRounding.AwayFromZero);
                        remaining = 0;
                    }
                    else
                    {
                        count = remaining / size;
                        remaining %= size;
                    }

                    if (options.Compact)
                    {
                        parts.Add($"{count}{compact}");
                    }
                    else
                    {
                        string label = count == 1 ? singular : plural;
                        parts.Add($"{count} {label}");
                    }

                    if (parts.Count >= options.MaxUnits)
                        break;
                }
            }

            return string.Join(options.Compact ? " " : ", ", parts);
        }

        // ============================================================================
        // parse-duration: Parses a duration string into seconds
        // ============================================================================

        public static long ParseDuration(string input)
        {
            input = input.Trim();

            if (string.IsNullOrEmpty(input))
                throw new ArgumentException("Empty string");

            if (input.StartsWith("-"))
                throw new ArgumentException("Negative duration");

            // Try colon notation first
            var colonMatch = Regex.Match(input, @"^(\d+):(\d{1,2})(?::(\d{1,2}))?$");
            if (colonMatch.Success)
            {
                int hours = int.Parse(colonMatch.Groups[1].Value);
                int minutes = int.Parse(colonMatch.Groups[2].Value);
                int seconds = colonMatch.Groups[3].Success ? int.Parse(colonMatch.Groups[3].Value) : 0;
                return hours * 3600L + minutes * 60L + seconds;
            }

            // Unit aliases map
            var unitMap = new Dictionary<string, long>
            {
                // years
                {"y", 31536000}, {"yr", 31536000}, {"yrs", 31536000}, {"year", 31536000}, {"years", 31536000},
                // months
                {"mo", 2592000}, {"month", 2592000}, {"months", 2592000},
                // weeks
                {"w", 604800}, {"wk", 604800}, {"wks", 604800}, {"week", 604800}, {"weeks", 604800},
                // days
                {"d", 86400}, {"day", 86400}, {"days", 86400},
                // hours
                {"h", 3600}, {"hr", 3600}, {"hrs", 3600}, {"hour", 3600}, {"hours", 3600},
                // minutes
                {"m", 60}, {"min", 60}, {"mins", 60}, {"minute", 60}, {"minutes", 60},
                // seconds
                {"s", 1}, {"sec", 1}, {"secs", 1}, {"second", 1}, {"seconds", 1}
            };

            // Normalize: lowercase, remove commas, strip "and", collapse whitespace
            string normalized = input.ToLower()
                .Replace(",", " ")
                .Replace(" and ", " ")
                .Trim();
            normalized = Regex.Replace(normalized, @"\s+", " ");

            // Match all number+unit pairs
            var matches = Regex.Matches(normalized, @"(\d+(?:\.\d+)?)\s*([a-z]+)");

            if (matches.Count == 0)
                throw new ArgumentException("No recognized number+unit pairs");

            double totalSeconds = 0;

            foreach (Match match in matches)
            {
                double value = double.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                string unit = match.Groups[2].Value;

                if (!unitMap.ContainsKey(unit))
                    throw new ArgumentException($"Unrecognized unit name");

                totalSeconds += value * unitMap[unit];
            }

            return (long)Math.Round(totalSeconds, MidpointRounding.AwayFromZero);
        }

        // ============================================================================
        // human-date: Contextual date string based on proximity
        // ============================================================================

        public static string HumanDate(long timestamp, long reference)
        {
            var tsDate = DateTimeOffset.FromUnixTimeSeconds(timestamp).UtcDateTime;
            var refDate = DateTimeOffset.FromUnixTimeSeconds(reference).UtcDateTime;

            // Truncate to midnight UTC
            var tsMidnight = new DateTime(tsDate.Year, tsDate.Month, tsDate.Day, 0, 0, 0, DateTimeKind.Utc);
            var refMidnight = new DateTime(refDate.Year, refDate.Month, refDate.Day, 0, 0, 0, DateTimeKind.Utc);

            int dayDiff = (int)Math.Round((tsMidnight - refMidnight).TotalDays);

            string[] dayNames = { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };
            string[] monthNames = { "", "January", "February", "March", "April", "May", "June", "July",
                                   "August", "September", "October", "November", "December" };

            if (dayDiff == 0)
                return "Today";
            if (dayDiff == -1)
                return "Yesterday";
            if (dayDiff == 1)
                return "Tomorrow";
            if (dayDiff >= -6 && dayDiff <= -2)
                return $"Last {dayNames[(int)tsDate.DayOfWeek]}";
            if (dayDiff >= 2 && dayDiff <= 6)
                return $"This {dayNames[(int)tsDate.DayOfWeek]}";

            // Same year
            if (tsDate.Year == refDate.Year)
                return $"{monthNames[tsDate.Month]} {tsDate.Day}";

            // Different year
            return $"{monthNames[tsDate.Month]} {tsDate.Day}, {tsDate.Year}";
        }

        // ============================================================================
        // date-range: Smart date range formatting
        // ============================================================================

        public static string DateRange(long start, long end)
        {
            // Auto-swap if needed
            if (start > end)
                (start, end) = (end, start);

            var startDate = DateTimeOffset.FromUnixTimeSeconds(start).UtcDateTime;
            var endDate = DateTimeOffset.FromUnixTimeSeconds(end).UtcDateTime;

            string[] monthNames = { "", "January", "February", "March", "April", "May", "June", "July",
                                   "August", "September", "October", "November", "December" };

            // Same day
            if (startDate.Year == endDate.Year && startDate.Month == endDate.Month && startDate.Day == endDate.Day)
                return $"{monthNames[startDate.Month]} {startDate.Day}, {startDate.Year}";

            // Same month & year
            if (startDate.Year == endDate.Year && startDate.Month == endDate.Month)
                return $"{monthNames[startDate.Month]} {startDate.Day}\u2013{endDate.Day}, {startDate.Year}";

            // Same year, different month
            if (startDate.Year == endDate.Year)
                return $"{monthNames[startDate.Month]} {startDate.Day} \u2013 {monthNames[endDate.Month]} {endDate.Day}, {startDate.Year}";

            // Different years
            return $"{monthNames[startDate.Month]} {startDate.Day}, {startDate.Year} \u2013 {monthNames[endDate.Month]} {endDate.Day}, {endDate.Year}";
        }
    }
}
