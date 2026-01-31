// Package whenwords provides pure functions for human-friendly date and time formatting.
// All functions accept explicit timestamps and never access the system clock.
package whenwords

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// TimeAgo converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".
func TimeAgo(timestamp, reference int64) string {
	diff := reference - timestamp
	future := diff < 0
	seconds := diff
	if seconds < 0 {
		seconds = -seconds
	}

	var value int64
	var unit string

	switch {
	case seconds <= 44:
		return "just now"
	case seconds <= 89:
		value = 1
		unit = "minute"
	case seconds <= 2640:
		value = int64(math.Round(float64(seconds) / 60))
		unit = "minute"
	case seconds <= 5340:
		value = 1
		unit = "hour"
	case seconds <= 75600:
		value = int64(math.Round(float64(seconds) / 3600))
		unit = "hour"
	case seconds <= 126000:
		value = 1
		unit = "day"
	case seconds <= 2160000:
		value = int64(math.Round(float64(seconds) / 86400))
		unit = "day"
	case seconds <= 3888000:
		value = 1
		unit = "month"
	case seconds <= 27561600:
		value = int64(math.Round(float64(seconds) / 2592000))
		unit = "month"
	case seconds <= 47260800:
		value = 1
		unit = "year"
	default:
		value = int64(math.Round(float64(seconds) / 31536000))
		unit = "year"
	}

	// Pluralize
	if value != 1 {
		unit += "s"
	}

	if future {
		return fmt.Sprintf("in %d %s", value, unit)
	}
	return fmt.Sprintf("%d %s ago", value, unit)
}

// Duration formats a number of seconds as a human-readable duration string.
// compact uses abbreviated units ("2h 30m" vs "2 hours, 30 minutes").
// maxUnits controls the maximum number of units to display (default-like: 2).
// Panics on negative seconds.
func Duration(seconds int, compact bool, maxUnits int) string {
	if seconds < 0 {
		panic("duration seconds must be non-negative")
	}

	type unitDef struct {
		secs    int
		verbose string
		abbrev  string
	}

	units := []unitDef{
		{31536000, "year", "y"},
		{2592000, "month", "mo"},
		{86400, "day", "d"},
		{3600, "hour", "h"},
		{60, "minute", "m"},
		{1, "second", "s"},
	}

	if seconds == 0 {
		if compact {
			return "0s"
		}
		return "0 seconds"
	}

	// Decompose into units
	type part struct {
		value int
		unit  unitDef
	}
	var parts []part
	remaining := seconds
	for _, u := range units {
		if remaining >= u.secs {
			v := remaining / u.secs
			remaining = remaining % u.secs
			parts = append(parts, part{v, u})
		}
	}

	// Apply maxUnits with rounding on the last displayed unit
	if len(parts) > maxUnits {
		// Round up the last kept unit based on the remainder
		lastIdx := maxUnits - 1
		lastUnit := parts[lastIdx]

		// Calculate the total remaining seconds after the last kept unit
		remainderSecs := 0
		for i := maxUnits; i < len(parts); i++ {
			remainderSecs += parts[i].value * parts[i].unit.secs
		}

		// Round: if remainder >= half of the last unit's seconds, round up
		if remainderSecs*2 >= lastUnit.unit.secs {
			parts[lastIdx].value++
		}

		parts = parts[:maxUnits]
	}

	// Build output
	var strs []string
	for _, p := range parts {
		if compact {
			strs = append(strs, fmt.Sprintf("%d%s", p.value, p.unit.abbrev))
		} else {
			name := p.unit.verbose
			if p.value != 1 {
				name += "s"
			}
			strs = append(strs, fmt.Sprintf("%d %s", p.value, name))
		}
	}

	if compact {
		return strings.Join(strs, " ")
	}
	return strings.Join(strs, ", ")
}

var (
	errEmpty       = errors.New("empty duration string")
	errUnrecognized = errors.New("unrecognized duration format")
	errNegative    = errors.New("negative duration")
	errBareNumber  = errors.New("bare number without units")
	errUnknownUnit = errors.New("unknown unit")
)

// unitSeconds maps unit aliases (lowercase) to their value in seconds.
var unitSeconds = map[string]float64{
	"y": 31536000, "yr": 31536000, "yrs": 31536000, "year": 31536000, "years": 31536000,
	"mo": 2592000, "month": 2592000, "months": 2592000,
	"w": 604800, "wk": 604800, "wks": 604800, "week": 604800, "weeks": 604800,
	"d": 86400, "day": 86400, "days": 86400,
	"h": 3600, "hr": 3600, "hrs": 3600, "hour": 3600, "hours": 3600,
	"m": 60, "min": 60, "mins": 60, "minute": 60, "minutes": 60,
	"s": 1, "sec": 1, "secs": 1, "second": 1, "seconds": 1,
}

// Regex for matching number+unit pairs
var pairRegex = regexp.MustCompile(`(\d+(?:\.\d+)?)\s*([a-zA-Z]+)`)

// Regex for colon format
var colonRegex = regexp.MustCompile(`^(\d+):(\d{2})(?::(\d{2}))?$`)

// ParseDuration parses a human-written duration string into total seconds.
func ParseDuration(input string) (int, error) {
	s := strings.TrimSpace(input)
	if s == "" {
		return 0, errEmpty
	}

	// Check for negative
	if strings.HasPrefix(s, "-") {
		return 0, errNegative
	}

	// Try colon format first
	if m := colonRegex.FindStringSubmatch(s); m != nil {
		hours, _ := strconv.Atoi(m[1])
		minutes, _ := strconv.Atoi(m[2])
		total := hours*3600 + minutes*60
		if m[3] != "" {
			secs, _ := strconv.Atoi(m[3])
			total += secs
		}
		return total, nil
	}

	// Strip "and", commas for normalization
	normalized := strings.ReplaceAll(s, ",", " ")
	normalized = strings.ReplaceAll(normalized, " and ", " ")

	// Find all number+unit pairs
	matches := pairRegex.FindAllStringSubmatch(normalized, -1)
	if len(matches) == 0 {
		// Check if it's just a bare number
		trimmed := strings.TrimSpace(normalized)
		if _, err := strconv.ParseFloat(trimmed, 64); err == nil {
			return 0, errBareNumber
		}
		return 0, errUnrecognized
	}

	// Verify that the entire input is consumed by the pairs (plus allowed separators)
	// Build a version of normalized with all pairs removed
	remainder := normalized
	for _, m := range matches {
		remainder = strings.Replace(remainder, m[0], "", 1)
	}
	remainder = strings.TrimSpace(remainder)
	// Allow only whitespace, commas, "and" in remainder
	remainder = strings.ReplaceAll(remainder, "and", "")
	remainder = strings.ReplaceAll(remainder, ",", "")
	remainder = strings.TrimSpace(remainder)
	if remainder != "" {
		return 0, errUnrecognized
	}

	total := 0.0
	for _, m := range matches {
		numStr := m[1]
		unitStr := strings.ToLower(m[2])

		num, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return 0, errUnrecognized
		}

		secs, ok := unitSeconds[unitStr]
		if !ok {
			return 0, errUnknownUnit
		}

		total += num * secs
	}

	return int(math.Round(total)), nil
}

// HumanDate returns a contextual date string based on proximity.
func HumanDate(timestamp, reference int64) string {
	ts := time.Unix(timestamp, 0).UTC()
	ref := time.Unix(reference, 0).UTC()

	// Truncate to dates
	tsDate := time.Date(ts.Year(), ts.Month(), ts.Day(), 0, 0, 0, 0, time.UTC)
	refDate := time.Date(ref.Year(), ref.Month(), ref.Day(), 0, 0, 0, 0, time.UTC)

	dayDiff := int(tsDate.Sub(refDate).Hours() / 24)

	switch {
	case dayDiff == 0:
		return "Today"
	case dayDiff == -1:
		return "Yesterday"
	case dayDiff == 1:
		return "Tomorrow"
	case dayDiff >= -6 && dayDiff <= -2:
		return "Last " + ts.Weekday().String()
	case dayDiff >= 2 && dayDiff <= 6:
		return "This " + ts.Weekday().String()
	case ts.Year() == ref.Year():
		return fmt.Sprintf("%s %d", ts.Month().String(), ts.Day())
	default:
		return fmt.Sprintf("%s %d, %d", ts.Month().String(), ts.Day(), ts.Year())
	}
}

// DateRange formats two timestamps as a smart date range.
func DateRange(start, end int64) string {
	if start > end {
		start, end = end, start
	}

	s := time.Unix(start, 0).UTC()
	e := time.Unix(end, 0).UTC()

	enDash := "\u2013"

	switch {
	case s.Year() == e.Year() && s.Month() == e.Month() && s.Day() == e.Day():
		// Same day
		return fmt.Sprintf("%s %d, %d", s.Month().String(), s.Day(), s.Year())
	case s.Year() == e.Year() && s.Month() == e.Month():
		// Same month
		return fmt.Sprintf("%s %d%s%d, %d", s.Month().String(), s.Day(), enDash, e.Day(), s.Year())
	case s.Year() == e.Year():
		// Same year, different month
		return fmt.Sprintf("%s %d %s %s %d, %d", s.Month().String(), s.Day(), enDash, e.Month().String(), e.Day(), s.Year())
	default:
		// Different years
		return fmt.Sprintf("%s %d, %d %s %s %d, %d", s.Month().String(), s.Day(), s.Year(), enDash, e.Month().String(), e.Day(), e.Year())
	}
}
