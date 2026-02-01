package whenwords

import (
	"testing"
	"time"
)

func ts(year int, month time.Month, day, hour, min, sec int) int64 {
	return time.Date(year, month, day, hour, min, sec, 0, time.UTC).Unix()
}

func TestTimeAgo(t *testing.T) {
	now := ts(2024, time.January, 15, 12, 0, 0)

	tests := []struct {
		name string
		ts   int64
		now  int64
		want string
	}{
		{"just now - 0 seconds", now, now, "just now"},
		{"just now - 10 seconds ago", now - 10, now, "just now"},
		{"just now - 45 seconds ago", now - 45, now, "just now"},
		{"just now - 10 seconds future", now + 10, now, "just now"},
		{"1 minute ago", now - 60, now, "1 minute ago"},
		{"2 minutes ago", now - 120, now, "2 minutes ago"},
		{"30 minutes ago", now - 1800, now, "30 minutes ago"},
		{"1 hour ago", now - 3600, now, "1 hour ago"},
		{"5 hours ago", now - 5*3600, now, "5 hours ago"},
		{"1 day ago", now - 86400, now, "1 day ago"},
		{"3 days ago", now - 3*86400, now, "3 days ago"},
		{"1 month ago", now - 30*86400, now, "1 month ago"},
		{"6 months ago", now - 180*86400, now, "6 months ago"},
		{"1 year ago", now - 400*86400, now, "1 year ago"},
		{"3 years ago", now - 3*365*86400, now, "3 years ago"},
		// Future
		{"in 5 minutes", now + 300, now, "in 5 minutes"},
		{"in 3 hours", now + 3*3600, now, "in 3 hours"},
		{"in 2 days", now + 2*86400, now, "in 2 days"},
		{"in 1 year", now + 400*86400, now, "in 1 year"},
		// Threshold boundaries
		{"46 seconds ago -> 1 minute", now - 46, now, "1 minute ago"},
		{"89 seconds -> 1 minute", now - 89, now, "1 minute ago"},
		{"90 seconds -> 2 minutes", now - 90, now, "2 minutes ago"},
		{"44 minutes -> 44 minutes", now - 44*60, now, "44 minutes ago"},
		{"45 minutes -> 1 hour", now - 45*60, now, "1 hour ago"},
		{"21 hours -> 21 hours", now - 21*3600, now, "21 hours ago"},
		{"22 hours -> 1 day", now - 22*3600, now, "1 day ago"},
		{"23 hours -> 1 day", now - 23*3600, now, "1 day ago"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := TimeAgo(tt.ts, tt.now)
			if got != tt.want {
				t.Errorf("TimeAgo(%d, %d) = %q, want %q", tt.ts, tt.now, got, tt.want)
			}
		})
	}
}

func TestDuration(t *testing.T) {
	tests := []struct {
		name     string
		seconds  int
		compact  bool
		maxUnits int
		want     string
	}{
		// Zero
		{"zero normal", 0, false, 2, "0 seconds"},
		{"zero compact", 0, true, 2, "0s"},
		// Simple
		{"1 second", 1, false, 2, "1 second"},
		{"30 seconds", 30, false, 2, "30 seconds"},
		{"1 minute", 60, false, 2, "1 minute"},
		{"90 seconds normal", 90, false, 2, "1 minute, 30 seconds"},
		{"90 seconds compact", 90, true, 2, "1m 30s"},
		// Hours and minutes
		{"1 hour", 3600, false, 2, "1 hour"},
		{"1.5 hours normal", 5400, false, 2, "1 hour, 30 minutes"},
		{"1.5 hours compact", 5400, true, 2, "1h 30m"},
		{"2h 30m 45s, max 2", 2*3600 + 30*60 + 45, false, 2, "2 hours, 31 minutes"},
		{"2h 30m 45s, max 3", 2*3600 + 30*60 + 45, false, 3, "2 hours, 30 minutes, 45 seconds"},
		{"2h 30m 45s compact max 1", 2*3600 + 30*60 + 45, true, 1, "3h"},
		// Days
		{"1 day", 86400, false, 2, "1 day"},
		{"1 day 12 hours", 86400 + 12*3600, false, 2, "1 day, 12 hours"},
		// Years
		{"1 year", 365 * 86400, false, 2, "1 year"},
		{"1 year 30 days", 365*86400 + 30*86400, false, 2, "1 year, 30 days"},
		// Rounding when truncating
		{"3661s max 1 -> 1 hour (rounds)", 3661, false, 1, "1 hour"},
		{"7199s max 1 -> 2 hours (rounds)", 7199, false, 1, "2 hours"},
		// Compact formatting
		{"compact multi", 86400 + 3600 + 60 + 1, true, 4, "1d 1h 1m 1s"},
		// Default maxUnits (0 means default=2)
		{"default maxUnits", 3661, false, 0, "1 hour, 1 minute"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Duration(tt.seconds, tt.compact, tt.maxUnits)
			if got != tt.want {
				t.Errorf("Duration(%d, %v, %d) = %q, want %q",
					tt.seconds, tt.compact, tt.maxUnits, got, tt.want)
			}
		})
	}
}

func TestDurationPanicsOnNegative(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Duration(-1, false, 2) did not panic")
		}
	}()
	Duration(-1, false, 2)
}

func TestParseDuration(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    int
		wantErr bool
	}{
		// Compact
		{"compact hours minutes", "2h30m", 2*3600 + 30*60, false},
		{"compact seconds", "45s", 45, false},
		{"compact hours only", "1h", 3600, false},
		{"compact mixed", "1d2h3m4s", 86400 + 2*3600 + 3*60 + 4, false},
		// Verbose
		{"verbose", "2 hours and 30 minutes", 2*3600 + 30*60, false},
		{"verbose singular", "1 hour", 3600, false},
		{"verbose with commas", "1 day, 2 hours, and 30 minutes", 86400 + 2*3600 + 30*60, false},
		// Colon notation
		{"colon h:m", "2:30", 2*3600 + 30*60, false},
		{"colon h:m:s", "1:30:00", 1*3600 + 30*60, false},
		{"colon h:m:s with seconds", "0:5:30", 5*60 + 30, false},
		// Decimals
		{"decimal hours", "2.5 hours", 2*3600 + 30*60, false},
		{"decimal minutes", "1.5 minutes", 90, false},
		// Unit abbreviations
		{"hr", "1 hr", 3600, false},
		{"hrs", "2 hrs", 7200, false},
		{"min", "5 min", 300, false},
		{"mins", "10 mins", 600, false},
		{"sec", "30 sec", 30, false},
		{"secs", "45 secs", 45, false},
		// Case insensitive
		{"upper case", "2H30M", 2*3600 + 30*60, false},
		{"mixed case", "2 Hours AND 30 Minutes", 2*3600 + 30*60, false},
		// Extra whitespace
		{"extra whitespace", "  2  hours   30  minutes  ", 2*3600 + 30*60, false},
		// Weeks
		{"weeks", "1 week", 7 * 86400, false},
		{"weeks short", "2w", 14 * 86400, false},
		// Error cases
		{"empty string", "", 0, true},
		{"whitespace only", "   ", 0, true},
		{"bare number", "42", 0, true},
		{"garbage", "hello world", 0, true},
		{"negative", "-5 hours", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseDuration(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ParseDuration(%q) = %d, want error", tt.input, got)
				}
				return
			}
			if err != nil {
				t.Errorf("ParseDuration(%q) returned error: %v", tt.input, err)
				return
			}
			if got != tt.want {
				t.Errorf("ParseDuration(%q) = %d, want %d", tt.input, got, tt.want)
			}
		})
	}
}

func TestHumanDate(t *testing.T) {
	now := ts(2024, time.January, 15, 14, 0, 0) // Monday Jan 15, 2024

	tests := []struct {
		name string
		ts   int64
		now  int64
		want string
	}{
		{"today", ts(2024, time.January, 15, 8, 0, 0), now, "Today"},
		{"yesterday", ts(2024, time.January, 14, 20, 0, 0), now, "Yesterday"},
		{"tomorrow", ts(2024, time.January, 16, 6, 0, 0), now, "Tomorrow"},
		// Last <weekday> (2-6 days ago)
		{"last saturday (2 days)", ts(2024, time.January, 13, 12, 0, 0), now, "Last Saturday"},
		{"last friday (3 days)", ts(2024, time.January, 12, 12, 0, 0), now, "Last Friday"},
		{"last wednesday (5 days)", ts(2024, time.January, 10, 12, 0, 0), now, "Last Wednesday"},
		{"last tuesday (6 days)", ts(2024, time.January, 9, 12, 0, 0), now, "Last Tuesday"},
		// This <weekday> (2-6 days in future)
		{"this wednesday (2 days)", ts(2024, time.January, 17, 12, 0, 0), now, "This Wednesday"},
		{"this friday (4 days)", ts(2024, time.January, 19, 12, 0, 0), now, "This Friday"},
		{"this sunday (6 days)", ts(2024, time.January, 21, 12, 0, 0), now, "This Sunday"},
		// Same year, further out
		{"same year month day", ts(2024, time.March, 5, 12, 0, 0), now, "March 5"},
		{"same year far future", ts(2024, time.November, 20, 12, 0, 0), now, "November 20"},
		{"same year far past", ts(2024, time.January, 1, 12, 0, 0), now, "January 1"},
		// Different year
		{"previous year", ts(2023, time.March, 5, 12, 0, 0), now, "March 5, 2023"},
		{"next year", ts(2025, time.June, 15, 12, 0, 0), now, "June 15, 2025"},
		{"far past", ts(2020, time.December, 25, 12, 0, 0), now, "December 25, 2020"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HumanDate(tt.ts, tt.now)
			if got != tt.want {
				t.Errorf("HumanDate(%d, %d) = %q, want %q", tt.ts, tt.now, got, tt.want)
			}
		})
	}
}

func TestDateRange(t *testing.T) {
	tests := []struct {
		name    string
		startTs int64
		endTs   int64
		want    string
	}{
		{
			"same day",
			ts(2024, time.January, 15, 10, 0, 0),
			ts(2024, time.January, 15, 18, 0, 0),
			"January 15, 2024",
		},
		{
			"same month",
			ts(2024, time.January, 15, 0, 0, 0),
			ts(2024, time.January, 22, 0, 0, 0),
			"January 15\u201322, 2024",
		},
		{
			"same year different months",
			ts(2024, time.January, 15, 0, 0, 0),
			ts(2024, time.February, 15, 0, 0, 0),
			"January 15 \u2013 February 15, 2024",
		},
		{
			"different years",
			ts(2023, time.December, 28, 0, 0, 0),
			ts(2024, time.January, 15, 0, 0, 0),
			"December 28, 2023 \u2013 January 15, 2024",
		},
		{
			"auto swap reversed",
			ts(2024, time.February, 15, 0, 0, 0),
			ts(2024, time.January, 15, 0, 0, 0),
			"January 15 \u2013 February 15, 2024",
		},
		{
			"same month end of month",
			ts(2024, time.March, 1, 0, 0, 0),
			ts(2024, time.March, 31, 0, 0, 0),
			"March 1\u201331, 2024",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DateRange(tt.startTs, tt.endTs)
			if got != tt.want {
				t.Errorf("DateRange(...) = %q, want %q", got, tt.want)
			}
		})
	}
}
