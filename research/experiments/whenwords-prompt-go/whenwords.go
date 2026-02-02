// Package whenwords provides human-friendly date and time formatting functions.
// All functions are pure — they never access the system clock.
package whenwords

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// TimeAgo returns a relative time string like "3 hours ago" or "in 2 days".
// Both ts and now are Unix epoch timestamps.
func TimeAgo(ts int64, now int64) string {
	diff := now - ts // positive = past, negative = future
	absDiff := diff
	if absDiff < 0 {
		absDiff = -absDiff
	}

	if absDiff <= 45 {
		return "just now"
	}

	unit, value := relativeUnit(float64(absDiff))

	label := unit
	if value != 1 {
		label = unit + "s"
	}

	if diff > 0 {
		return fmt.Sprintf("%d %s ago", value, label)
	}
	return fmt.Sprintf("in %d %s", value, label)
}

func relativeUnit(seconds float64) (string, int) {
	thresholds := []struct {
		limit   float64
		divisor float64
		unit    string
	}{
		{45, 1, "second"},
		{90, 60, "minute"},           // up to 90s => "1 minute"
		{45 * 60, 60, "minute"},      // up to 45 min
		{90 * 60, 3600, "hour"},      // up to 90 min => "1 hour"
		{22 * 3600, 3600, "hour"},    // up to 22 hours
		{36 * 3600, 86400, "day"},    // up to 36 hours => "1 day"
		{26 * 86400, 86400, "day"},   // up to 26 days
		{45 * 86400, 2592000, "month"},  // up to 45 days => "1 month"
		{320 * 86400, 2592000, "month"}, // up to ~11 months (30-day months)
		{548 * 86400, 31536000, "year"}, // up to ~1.5 years => "1 year"
		{math.MaxFloat64, 31536000, "year"},
	}

	for _, t := range thresholds {
		if seconds < t.limit {
			val := int(math.Round(seconds / t.divisor))
			if val < 1 {
				val = 1
			}
			return t.unit, val
		}
	}
	// unreachable
	val := int(math.Round(seconds / 31536000))
	return "year", val
}

// Duration formats a number of seconds as a human-readable duration.
// If compact is true, use short form like "2h 30m".
// maxUnits controls how many units to show (default behavior: 2 largest non-zero).
// Panics on negative input.
func Duration(seconds int, compact bool, maxUnits int) string {
	if seconds < 0 {
		panic("negative duration")
	}
	if seconds == 0 {
		if compact {
			return "0s"
		}
		return "0 seconds"
	}
	if maxUnits <= 0 {
		maxUnits = 2
	}

	type unitDef struct {
		name    string
		short   string
		divisor int
	}
	units := []unitDef{
		{"year", "y", 365 * 24 * 3600},
		{"day", "d", 24 * 3600},
		{"hour", "h", 3600},
		{"minute", "m", 60},
		{"second", "s", 1},
	}

	// Decompose into units
	type part struct {
		value int
		unit  unitDef
	}
	var parts []part
	remaining := seconds
	for _, u := range units {
		if remaining >= u.divisor {
			v := remaining / u.divisor
			remaining = remaining % u.divisor
			parts = append(parts, part{v, u})
		}
	}

	// If we need to truncate, round the last kept unit
	if len(parts) > maxUnits {
		// Calculate the remainder in seconds that we're dropping
		var droppedSeconds int
		for _, p := range parts[maxUnits:] {
			droppedSeconds += p.value * p.unit.divisor
		}
		parts = parts[:maxUnits]
		// Round the last unit
		lastUnit := parts[maxUnits-1].unit
		if droppedSeconds*2 >= lastUnit.divisor {
			parts[maxUnits-1].value++
			// Handle carry-over
			for i := len(parts) - 1; i > 0; i-- {
				var parentDivisor int
				parentDivisor = parts[i-1].unit.divisor / parts[i].unit.divisor
				if parts[i].value >= parentDivisor {
					parts[i].value -= parentDivisor
					parts[i-1].value++
				}
			}
		}
	}

	// Format
	var result []string
	for _, p := range parts {
		if p.value == 0 {
			continue
		}
		if compact {
			result = append(result, fmt.Sprintf("%d%s", p.value, p.unit.short))
		} else {
			name := p.unit.name
			if p.value != 1 {
				name += "s"
			}
			result = append(result, fmt.Sprintf("%d %s", p.value, name))
		}
	}

	if len(result) == 0 {
		if compact {
			return "0s"
		}
		return "0 seconds"
	}

	if compact {
		return strings.Join(result, " ")
	}
	return strings.Join(result, ", ")
}

// ParseDuration parses a human-written duration string into seconds.
// Accepts compact ("2h30m"), verbose ("2 hours and 30 minutes"),
// colon notation ("2:30", "1:30:00"), decimals ("2.5 hours"),
// and mixed formats. Returns an error on invalid input.
func ParseDuration(input string) (int, error) {
	s := strings.TrimSpace(input)
	if s == "" {
		return 0, fmt.Errorf("empty duration string")
	}

	// Try colon notation first
	if colonRe.MatchString(s) {
		return parseColon(s)
	}

	// Remove "and", commas, normalize whitespace
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, ",", " ")
	s = strings.ReplaceAll(s, " and ", " ")
	s = spaceRe.ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)

	if s == "" {
		return 0, fmt.Errorf("empty duration string")
	}

	matches := durationTokenRe.FindAllStringSubmatch(s, -1)
	if len(matches) == 0 {
		return 0, fmt.Errorf("unrecognized duration format: %q", input)
	}

	// Check that the matches cover the entire string (after normalization)
	covered := durationTokenRe.ReplaceAllString(s, "")
	covered = strings.TrimSpace(covered)
	if covered != "" {
		// Check if remaining is just whitespace or empty
		remaining := strings.TrimSpace(covered)
		if remaining != "" {
			return 0, fmt.Errorf("unrecognized duration format: %q", input)
		}
	}

	totalSeconds := 0.0
	for _, m := range matches {
		numStr := m[1]
		unitStr := m[2]

		if unitStr == "" {
			return 0, fmt.Errorf("bare number without units: %q", input)
		}

		num, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid number %q: %w", numStr, err)
		}
		if num < 0 {
			return 0, fmt.Errorf("negative value not allowed")
		}

		multiplier, ok := unitMultiplier(unitStr)
		if !ok {
			return 0, fmt.Errorf("unrecognized unit: %q", unitStr)
		}

		totalSeconds += num * float64(multiplier)
	}

	result := int(math.Round(totalSeconds))
	if result < 0 {
		return 0, fmt.Errorf("negative duration")
	}
	return result, nil
}

var (
	colonRe        = regexp.MustCompile(`^\s*\d+:\d{1,2}(:\d{1,2})?\s*$`)
	spaceRe        = regexp.MustCompile(`\s+`)
	durationTokenRe = regexp.MustCompile(`(\d+(?:\.\d+)?)\s*([a-z]*)`)
)

func parseColon(s string) (int, error) {
	s = strings.TrimSpace(s)
	parts := strings.Split(s, ":")
	if len(parts) == 2 {
		h, err1 := strconv.Atoi(parts[0])
		m, err2 := strconv.Atoi(parts[1])
		if err1 != nil || err2 != nil {
			return 0, fmt.Errorf("invalid colon notation: %q", s)
		}
		return h*3600 + m*60, nil
	}
	if len(parts) == 3 {
		h, err1 := strconv.Atoi(parts[0])
		m, err2 := strconv.Atoi(parts[1])
		sec, err3 := strconv.Atoi(parts[2])
		if err1 != nil || err2 != nil || err3 != nil {
			return 0, fmt.Errorf("invalid colon notation: %q", s)
		}
		return h*3600 + m*60 + sec, nil
	}
	return 0, fmt.Errorf("invalid colon notation: %q", s)
}

func unitMultiplier(unit string) (int, bool) {
	switch unit {
	case "s", "sec", "secs", "second", "seconds":
		return 1, true
	case "m", "min", "mins", "minute", "minutes":
		return 60, true
	case "h", "hr", "hrs", "hour", "hours":
		return 3600, true
	case "d", "day", "days":
		return 86400, true
	case "w", "wk", "wks", "week", "weeks":
		return 7 * 86400, true
	case "mo", "month", "months":
		return 30 * 86400, true
	case "y", "yr", "yrs", "year", "years":
		return 365 * 86400, true
	}
	return 0, false
}

// HumanDate returns a contextual date string relative to a reference time.
// Uses "Today", "Yesterday", "Tomorrow", day names for nearby dates,
// "March 5" for same year, "March 5, 2023" for different years.
func HumanDate(ts int64, now int64) string {
	date := time.Unix(ts, 0).UTC()
	ref := time.Unix(now, 0).UTC()

	dateDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	refDay := time.Date(ref.Year(), ref.Month(), ref.Day(), 0, 0, 0, 0, time.UTC)

	dayDiff := int(refDay.Sub(dateDay).Hours() / 24)

	switch dayDiff {
	case 0:
		return "Today"
	case 1:
		return "Yesterday"
	case -1:
		return "Tomorrow"
	}

	// Within about a week (2-6 days)
	if dayDiff >= 2 && dayDiff <= 6 {
		return "Last " + date.Weekday().String()
	}
	if dayDiff <= -2 && dayDiff >= -6 {
		return "This " + date.Weekday().String()
	}

	// Same year
	if date.Year() == ref.Year() {
		return fmt.Sprintf("%s %d", date.Month().String(), date.Day())
	}

	// Different year
	return fmt.Sprintf("%s %d, %d", date.Month().String(), date.Day(), date.Year())
}

// DateRange formats two timestamps as a smart date range string.
// Collapses redundant information and uses en-dash. Auto-swaps if start > end.
func DateRange(startTs int64, endTs int64) string {
	if startTs > endTs {
		startTs, endTs = endTs, startTs
	}

	start := time.Unix(startTs, 0).UTC()
	end := time.Unix(endTs, 0).UTC()

	// Same day
	if start.Year() == end.Year() && start.Month() == end.Month() && start.Day() == end.Day() {
		return fmt.Sprintf("%s %d, %d", start.Month().String(), start.Day(), start.Year())
	}

	// Same month and year
	if start.Year() == end.Year() && start.Month() == end.Month() {
		return fmt.Sprintf("%s %d\u2013%d, %d", start.Month().String(), start.Day(), end.Day(), start.Year())
	}

	// Same year, different months
	if start.Year() == end.Year() {
		return fmt.Sprintf("%s %d \u2013 %s %d, %d",
			start.Month().String(), start.Day(),
			end.Month().String(), end.Day(),
			start.Year())
	}

	// Different years
	return fmt.Sprintf("%s %d, %d \u2013 %s %d, %d",
		start.Month().String(), start.Day(), start.Year(),
		end.Month().String(), end.Day(), end.Year())
}
