package whenwords

import (
	"testing"
)

func TestTimeAgoPast(t *testing.T) {
	const ref int64 = 1704067200

	tests := []struct {
		timestamp int64
		want      string
	}{
		{1704067200, "just now"},
		{1704067170, "just now"},
		{1704067156, "just now"},
		{1704067155, "1 minute ago"},
		{1704067111, "1 minute ago"},
		{1704067110, "2 minutes ago"},
		{1704065400, "30 minutes ago"},
		{1704064560, "44 minutes ago"},
		{1704064500, "1 hour ago"},
		{1704061860, "1 hour ago"},
		{1704061800, "2 hours ago"},
		{1704049200, "5 hours ago"},
		{1703991600, "21 hours ago"},
		{1703988000, "1 day ago"},
		{1703941200, "1 day ago"},
		{1703937600, "2 days ago"},
		{1703462400, "7 days ago"},
		{1701907200, "25 days ago"},
		{1701820800, "1 month ago"},
		{1700179200, "1 month ago"},
		{1700092800, "2 months ago"},
		{1688169600, "6 months ago"},
		{1676505600, "11 months ago"},
		{1676419200, "1 year ago"},
		{1656806400, "1 year ago"},
		{1656720000, "2 years ago"},
		{1546300800, "5 years ago"},
	}

	for _, tt := range tests {
		got := TimeAgo(tt.timestamp, ref)
		if got != tt.want {
			t.Errorf("TimeAgo(%d, %d) = %q, want %q", tt.timestamp, ref, got, tt.want)
		}
	}
}

func TestTimeAgoFuture(t *testing.T) {
	const ref int64 = 1704067200

	tests := []struct {
		timestamp int64
		want      string
	}{
		{1704067230, "just now"},
		{1704067260, "in 1 minute"},
		{1704067500, "in 5 minutes"},
		{1704070200, "in 1 hour"},
		{1704078000, "in 3 hours"},
		{1704150000, "in 1 day"},
		{1704240000, "in 2 days"},
		{1706745600, "in 1 month"},
		{1735689600, "in 1 year"},
	}

	for _, tt := range tests {
		got := TimeAgo(tt.timestamp, ref)
		if got != tt.want {
			t.Errorf("TimeAgo(%d, %d) = %q, want %q", tt.timestamp, ref, got, tt.want)
		}
	}
}

func TestDurationNormal(t *testing.T) {
	tests := []struct {
		seconds int
		want    string
	}{
		{0, "0 seconds"},
		{1, "1 second"},
		{45, "45 seconds"},
		{60, "1 minute"},
		{90, "1 minute, 30 seconds"},
		{120, "2 minutes"},
		{3600, "1 hour"},
		{3661, "1 hour, 1 minute"},
		{5400, "1 hour, 30 minutes"},
		{9000, "2 hours, 30 minutes"},
		{86400, "1 day"},
		{93600, "1 day, 2 hours"},
		{604800, "7 days"},
		{2592000, "1 month"},
		{31536000, "1 year"},
		{36720000, "1 year, 2 months"},
	}

	for _, tt := range tests {
		got := Duration(tt.seconds, false, 2)
		if got != tt.want {
			t.Errorf("Duration(%d, false, 2) = %q, want %q", tt.seconds, got, tt.want)
		}
	}
}

func TestDurationCompact(t *testing.T) {
	tests := []struct {
		seconds int
		want    string
	}{
		{0, "0s"},
		{45, "45s"},
		{3661, "1h 1m"},
		{9000, "2h 30m"},
		{93600, "1d 2h"},
	}

	for _, tt := range tests {
		got := Duration(tt.seconds, true, 2)
		if got != tt.want {
			t.Errorf("Duration(%d, true, 2) = %q, want %q", tt.seconds, got, tt.want)
		}
	}
}

func TestDurationMaxUnits(t *testing.T) {
	tests := []struct {
		seconds  int
		maxUnits int
		want     string
	}{
		{3661, 1, "1 hour"},
		{93600, 1, "1 day"},
		{93661, 3, "1 day, 2 hours, 1 minute"},
	}

	for _, tt := range tests {
		got := Duration(tt.seconds, false, tt.maxUnits)
		if got != tt.want {
			t.Errorf("Duration(%d, false, %d) = %q, want %q", tt.seconds, tt.maxUnits, got, tt.want)
		}
	}
}

func TestDurationCompactMaxUnits(t *testing.T) {
	got := Duration(9000, true, 1)
	want := "3h"
	if got != want {
		t.Errorf("Duration(9000, true, 1) = %q, want %q", got, want)
	}
}

func TestDurationNegativePanics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Duration(-1, false, 2) did not panic")
		}
	}()
	Duration(-1, false, 2)
}

func TestDurationDefault(t *testing.T) {
	got := DurationDefault(3661)
	want := "1 hour, 1 minute"
	if got != want {
		t.Errorf("DurationDefault(3661) = %q, want %q", got, want)
	}
}

func TestParseDurationCompact(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"2h30m", 9000},
		{"2h 30m", 9000},
		{"2h, 30m", 9000},
		{"1.5h", 5400},
		{"90m", 5400},
		{"90min", 5400},
		{"45s", 45},
		{"45sec", 45},
		{"2d", 172800},
		{"1w", 604800},
		{"1d 2h 30m", 95400},
		{"2hr", 7200},
		{"2hrs", 7200},
		{"30mins", 1800},
	}

	for _, tt := range tests {
		got, err := ParseDuration(tt.input)
		if err != nil {
			t.Errorf("ParseDuration(%q) returned error: %v", tt.input, err)
			continue
		}
		if got != tt.want {
			t.Errorf("ParseDuration(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

func TestParseDurationVerbose(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"2 hours 30 minutes", 9000},
		{"2 hours and 30 minutes", 9000},
		{"2 hours, and 30 minutes", 9000},
		{"2.5 hours", 9000},
		{"90 minutes", 5400},
		{"2 days", 172800},
		{"1 week", 604800},
		{"1 day, 2 hours, and 30 minutes", 95400},
		{"45 seconds", 45},
	}

	for _, tt := range tests {
		got, err := ParseDuration(tt.input)
		if err != nil {
			t.Errorf("ParseDuration(%q) returned error: %v", tt.input, err)
			continue
		}
		if got != tt.want {
			t.Errorf("ParseDuration(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

func TestParseDurationColon(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"2:30", 9000},
		{"1:30:00", 5400},
		{"0:05:30", 330},
	}

	for _, tt := range tests {
		got, err := ParseDuration(tt.input)
		if err != nil {
			t.Errorf("ParseDuration(%q) returned error: %v", tt.input, err)
			continue
		}
		if got != tt.want {
			t.Errorf("ParseDuration(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

func TestParseDurationCaseInsensitive(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"2H 30M", 9000},
		{"  2 hours   30 minutes  ", 9000},
	}

	for _, tt := range tests {
		got, err := ParseDuration(tt.input)
		if err != nil {
			t.Errorf("ParseDuration(%q) returned error: %v", tt.input, err)
			continue
		}
		if got != tt.want {
			t.Errorf("ParseDuration(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

func TestParseDurationErrors(t *testing.T) {
	tests := []string{
		"",
		"hello world",
		"-5 hours",
		"42",
		"5 foos",
	}

	for _, input := range tests {
		_, err := ParseDuration(input)
		if err == nil {
			t.Errorf("ParseDuration(%q) should have returned error", input)
		}
	}
}

func TestHumanDate(t *testing.T) {
	const ref int64 = 1705276800 // 2024-01-15 Monday

	tests := []struct {
		timestamp int64
		want      string
	}{
		{1705276800, "Today"},
		{1705320000, "Today"},
		{1705190400, "Yesterday"},
		{1705363200, "Tomorrow"},
		{1705104000, "Last Saturday"},
		{1705017600, "Last Friday"},
		{1704931200, "Last Thursday"},
		{1704844800, "Last Wednesday"},
		{1704758400, "Last Tuesday"},
		{1704672000, "January 8"},
		{1705449600, "This Wednesday"},
		{1705536000, "This Thursday"},
		{1705795200, "This Sunday"},
		{1705881600, "January 22"},
		{1709251200, "March 1"},
		{1735603200, "December 31"},
		{1672531200, "January 1, 2023"},
		{1736121600, "January 6, 2025"},
	}

	for _, tt := range tests {
		got := HumanDate(tt.timestamp, ref)
		if got != tt.want {
			t.Errorf("HumanDate(%d, %d) = %q, want %q", tt.timestamp, ref, got, tt.want)
		}
	}
}

func TestDateRange(t *testing.T) {
	tests := []struct {
		start int64
		end   int64
		want  string
	}{
		{1705276800, 1705276800, "January 15, 2024"},
		{1705276800, 1705320000, "January 15, 2024"},
		{1705276800, 1705363200, "January 15\u201316, 2024"},
		{1705276800, 1705881600, "January 15\u201322, 2024"},
		{1705276800, 1707955200, "January 15 \u2013 February 15, 2024"},
		{1703721600, 1705276800, "December 28, 2023 \u2013 January 15, 2024"},
		{1704067200, 1735603200, "January 1 \u2013 December 31, 2024"},
		{1705881600, 1705276800, "January 15\u201322, 2024"},   // swapped
		{1672531200, 1735689600, "January 1, 2023 \u2013 January 1, 2025"},
	}

	for _, tt := range tests {
		got := DateRange(tt.start, tt.end)
		if got != tt.want {
			t.Errorf("DateRange(%d, %d) = %q, want %q", tt.start, tt.end, got, tt.want)
		}
	}
}
