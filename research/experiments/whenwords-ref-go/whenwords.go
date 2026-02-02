// Package whenwords provides human-friendly date/time formatting.
// All functions are pure — no system clock access.
package whenwords

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// TimeAgo returns a human-readable string describing the distance between
// timestamp and reference, both as Unix epoch seconds.
func TimeAgo(timestamp int64, reference int64) string {
	diff := reference - timestamp
	isFuture := diff < 0
	seconds := math.Abs(float64(diff))

	var label string
	switch {
	case seconds <= 44:
		return "just now"
	case seconds <= 89:
		label = "1 minute"
	case seconds <= 44*60:
		n := int(math.Round(seconds / 60))
		label = fmt.Sprintf("%d minutes", n)
	case seconds <= 89*60:
		label = "1 hour"
	case seconds <= 21*3600:
		n := int(math.Round(seconds / 3600))
		label = fmt.Sprintf("%d hours", n)
	case seconds <= 35*3600:
		label = "1 day"
	case seconds <= 25*86400:
		n := int(math.Round(seconds / 86400))
		label = fmt.Sprintf("%d days", n)
	case seconds <= 45*86400:
		label = "1 month"
	case seconds <= 319*86400:
		n := int(math.Round(seconds / (30 * 86400)))
		label = fmt.Sprintf("%d months", n)
	case seconds <= 547*86400:
		label = "1 year"
	default:
		n := int(math.Round(seconds / (365 * 86400)))
		label = fmt.Sprintf("%d years", n)
	}

	if isFuture {
		return "in " + label
	}
	return label + " ago"
}

// Duration formats an integer number of seconds into a human-readable duration string.
// If compact is true, abbreviated unit names are used (e.g. "2h 30m").
// maxUnits limits how many units appear; the last displayed unit is rounded.
// Panics if seconds is negative.
func Duration(seconds int, compact bool, maxUnits int) string {
	if seconds < 0 {
		panic("negative duration")
	}

	type unit struct {
		name    string
		abbrev  string
		seconds int
	}
	units := []unit{
		{"year", "y", 365 * 86400},
		{"month", "mo", 30 * 86400},
		{"day", "d", 86400},
		{"hour", "h", 3600},
		{"minute", "m", 60},
		{"second", "s", 1},
	}

	if seconds == 0 {
		if compact {
			return "0s"
		}
		return "0 seconds"
	}

	type part struct {
		value int
		unit  unit
	}

	remaining := seconds
	var parts []part
	for _, u := range units {
		if remaining >= u.seconds {
			v := remaining / u.seconds
			remaining = remaining % u.seconds
			parts = append(parts, part{v, u})
		}
	}

	// Apply maxUnits: if we need to truncate, round the last kept unit
	if maxUnits > 0 && len(parts) > maxUnits {
		// Calculate remaining seconds after the truncation point
		remainAfterTrunc := 0
		for i := maxUnits; i < len(parts); i++ {
			remainAfterTrunc += parts[i].value * parts[i].unit.seconds
		}
		lastUnit := parts[maxUnits-1].unit.seconds
		if float64(remainAfterTrunc)/float64(lastUnit) >= 0.5 {
			parts[maxUnits-1].value++
		}
		parts = parts[:maxUnits]
	}

	var result []string
	for _, p := range parts {
		if compact {
			result = append(result, fmt.Sprintf("%d%s", p.value, p.unit.abbrev))
		} else {
			name := p.unit.name
			if p.value != 1 {
				name += "s"
			}
			result = append(result, fmt.Sprintf("%d %s", p.value, name))
		}
	}

	if compact {
		return strings.Join(result, " ")
	}
	return strings.Join(result, ", ")
}

// DurationDefault is a convenience wrapper for Duration with compact=false and maxUnits=2.
func DurationDefault(seconds int) string {
	return Duration(seconds, false, 2)
}

// unitMap maps unit strings to their value in seconds.
var unitMap = map[string]int{
	"y": 365 * 86400, "yr": 365 * 86400, "yrs": 365 * 86400, "year": 365 * 86400, "years": 365 * 86400,
	"mo": 30 * 86400, "month": 30 * 86400, "months": 30 * 86400,
	"w": 7 * 86400, "wk": 7 * 86400, "wks": 7 * 86400, "week": 7 * 86400, "weeks": 7 * 86400,
	"d": 86400, "day": 86400, "days": 86400,
	"h": 3600, "hr": 3600, "hrs": 3600, "hour": 3600, "hours": 3600,
	"m": 60, "min": 60, "mins": 60, "minute": 60, "minutes": 60,
	"s": 1, "sec": 1, "secs": 1, "second": 1, "seconds": 1,
}

// colonRe matches colon-separated time like "2:30" or "1:30:00".
var colonRe = regexp.MustCompile(`^\s*(\d+):(\d{2})(?::(\d{2}))?\s*$`)

// tokenRe matches a number (possibly decimal) followed by an optional unit.
var tokenRe = regexp.MustCompile(`(\d+(?:\.\d+)?)\s*([a-zA-Z]+)`)

// ParseDuration parses a human-readable duration string and returns the total seconds.
// Supported formats: compact ("2h30m"), verbose ("2 hours 30 minutes"),
// colon ("2:30" = 2h30m, "1:30:00" = 1h30m), decimal ("2.5 hours"), mixed.
// Case insensitive. Tolerates whitespace. Returns error for invalid input.
func ParseDuration(input string) (int, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return 0, fmt.Errorf("empty input")
	}

	// Check for negative
	if strings.HasPrefix(trimmed, "-") {
		return 0, fmt.Errorf("negative duration not allowed")
	}

	// Try colon format first
	if m := colonRe.FindStringSubmatch(trimmed); m != nil {
		if m[3] != "" {
			// H:MM:SS
			h, _ := strconv.Atoi(m[1])
			min, _ := strconv.Atoi(m[2])
			s, _ := strconv.Atoi(m[3])
			return h*3600 + min*60 + s, nil
		}
		// H:MM
		h, _ := strconv.Atoi(m[1])
		min, _ := strconv.Atoi(m[2])
		return h*3600 + min*60, nil
	}

	// Strip filler words: "and", ","
	cleaned := strings.ToLower(trimmed)
	cleaned = strings.ReplaceAll(cleaned, ",", " ")
	cleaned = strings.ReplaceAll(cleaned, " and ", " ")

	matches := tokenRe.FindAllStringSubmatch(cleaned, -1)
	if len(matches) == 0 {
		return 0, fmt.Errorf("invalid duration: %q", input)
	}

	total := 0.0
	for _, m := range matches {
		numStr := m[1]
		unitStr := m[2]
		// ParseFloat cannot fail here: tokenRe guarantees numStr matches \d+(?:\.\d+)?
		num, _ := strconv.ParseFloat(numStr, 64)
		secs, ok := unitMap[unitStr]
		if !ok {
			return 0, fmt.Errorf("unknown unit: %q", unitStr)
		}
		total += num * float64(secs)
	}

	return int(math.Round(total)), nil
}

// HumanDate returns a human-friendly label for a date relative to a reference date.
// Both timestamp and reference are Unix epoch seconds interpreted in UTC.
func HumanDate(timestamp int64, reference int64) string {
	tsTime := time.Unix(timestamp, 0).UTC()
	refTime := time.Unix(reference, 0).UTC()

	// Truncate to midnight UTC
	tsMidnight := time.Date(tsTime.Year(), tsTime.Month(), tsTime.Day(), 0, 0, 0, 0, time.UTC)
	refMidnight := time.Date(refTime.Year(), refTime.Month(), refTime.Day(), 0, 0, 0, 0, time.UTC)

	dayDiff := int(tsMidnight.Sub(refMidnight).Hours() / 24)

	switch {
	case dayDiff == 0:
		return "Today"
	case dayDiff == -1:
		return "Yesterday"
	case dayDiff == 1:
		return "Tomorrow"
	case dayDiff >= -6 && dayDiff <= -2:
		return "Last " + tsTime.Weekday().String()
	case dayDiff >= 2 && dayDiff <= 6:
		return "This " + tsTime.Weekday().String()
	case tsTime.Year() == refTime.Year():
		return fmt.Sprintf("%s %d", tsTime.Month().String(), tsTime.Day())
	default:
		return fmt.Sprintf("%s %d, %d", tsTime.Month().String(), tsTime.Day(), tsTime.Year())
	}
}

// DateRange formats a date range as a human-readable string using en-dashes.
// Both start and end are Unix epoch seconds in UTC. If start > end, they are swapped.
func DateRange(start int64, end int64) string {
	if start > end {
		start, end = end, start
	}

	s := time.Unix(start, 0).UTC()
	e := time.Unix(end, 0).UTC()

	enDash := "\u2013"

	sameDay := s.Year() == e.Year() && s.Month() == e.Month() && s.Day() == e.Day()
	sameMonth := s.Year() == e.Year() && s.Month() == e.Month()
	sameYear := s.Year() == e.Year()

	switch {
	case sameDay:
		return fmt.Sprintf("%s %d, %d", s.Month().String(), s.Day(), s.Year())
	case sameMonth:
		return fmt.Sprintf("%s %d%s%d, %d", s.Month().String(), s.Day(), enDash, e.Day(), s.Year())
	case sameYear:
		return fmt.Sprintf("%s %d %s %s %d, %d", s.Month().String(), s.Day(), enDash, e.Month().String(), e.Day(), s.Year())
	default:
		return fmt.Sprintf("%s %d, %d %s %s %d, %d", s.Month().String(), s.Day(), s.Year(), enDash, e.Month().String(), e.Day(), e.Year())
	}
}
