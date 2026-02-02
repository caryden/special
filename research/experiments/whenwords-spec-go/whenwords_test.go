package whenwords

import (
	"testing"
)

func TestTimeAgoPast(t *testing.T) {
	ref := int64(1704067200) // 2024-01-01 00:00:00 UTC

	tests := []struct {
		timestamp int64
		expected  string
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
		t.Run(tt.expected, func(t *testing.T) {
			got := TimeAgo(tt.timestamp, ref)
			if got != tt.expected {
				t.Errorf("TimeAgo(%d, %d) = %q, want %q", tt.timestamp, ref, got, tt.expected)
			}
		})
	}
}

func TestTimeAgoFuture(t *testing.T) {
	ref := int64(1704067200) // 2024-01-01 00:00:00 UTC

	tests := []struct {
		timestamp int64
		expected  string
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
		t.Run(tt.expected, func(t *testing.T) {
			got := TimeAgo(tt.timestamp, ref)
			if got != tt.expected {
				t.Errorf("TimeAgo(%d, %d) = %q, want %q", tt.timestamp, ref, got, tt.expected)
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
		expected string
	}{
		{"0 default", 0, false, 2, "0 seconds"},
		{"1 default", 1, false, 2, "1 second"},
		{"45 default", 45, false, 2, "45 seconds"},
		{"60 default", 60, false, 2, "1 minute"},
		{"90 default", 90, false, 2, "1 minute, 30 seconds"},
		{"120 default", 120, false, 2, "2 minutes"},
		{"3600 default", 3600, false, 2, "1 hour"},
		{"3661 default", 3661, false, 2, "1 hour, 1 minute"},
		{"5400 default", 5400, false, 2, "1 hour, 30 minutes"},
		{"9000 default", 9000, false, 2, "2 hours, 30 minutes"},
		{"86400 default", 86400, false, 2, "1 day"},
		{"93600 default", 93600, false, 2, "1 day, 2 hours"},
		{"604800 default", 604800, false, 2, "7 days"},
		{"2592000 default", 2592000, false, 2, "1 month"},
		{"31536000 default", 31536000, false, 2, "1 year"},
		{"36720000 default", 36720000, false, 2, "1 year, 2 months"},
		{"0 compact", 0, true, 2, "0s"},
		{"45 compact", 45, true, 2, "45s"},
		{"3661 compact", 3661, true, 2, "1h 1m"},
		{"9000 compact", 9000, true, 2, "2h 30m"},
		{"93600 compact", 93600, true, 2, "1d 2h"},
		{"3661 max1", 3661, false, 1, "1 hour"},
		{"93600 max1", 93600, false, 1, "1 day"},
		{"93661 max3", 93661, false, 3, "1 day, 2 hours, 1 minute"},
		{"9000 compact max1", 9000, true, 1, "3h"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Duration(tt.seconds, tt.compact, tt.maxUnits)
			if got != tt.expected {
				t.Errorf("Duration(%d, compact=%v, maxUnits=%d) = %q, want %q",
					tt.seconds, tt.compact, tt.maxUnits, got, tt.expected)
			}
		})
	}
}

func TestDurationPanic(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Duration(-100, false, 2) did not panic")
		}
	}()
	Duration(-100, false, 2)
}

func TestParseDuration(t *testing.T) {
	tests := []struct {
		input    string
		expected int
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
		{"2 hours 30 minutes", 9000},
		{"2 hours and 30 minutes", 9000},
		{"2 hours, and 30 minutes", 9000},
		{"2.5 hours", 9000},
		{"90 minutes", 5400},
		{"2 days", 172800},
		{"1 week", 604800},
		{"1 day, 2 hours, and 30 minutes", 95400},
		{"45 seconds", 45},
		{"2:30", 9000},
		{"1:30:00", 5400},
		{"0:05:30", 330},
		{"2H 30M", 9000},
		{"  2 hours   30 minutes  ", 9000},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got, err := ParseDuration(tt.input)
			if err != nil {
				t.Errorf("ParseDuration(%q) returned error: %v", tt.input, err)
				return
			}
			if got != tt.expected {
				t.Errorf("ParseDuration(%q) = %d, want %d", tt.input, got, tt.expected)
			}
		})
	}
}

func TestParseDurationErrors(t *testing.T) {
	tests := []struct {
		input string
	}{
		{""},
		{"hello world"},
		{"-5 hours"},
		{"42"},
		{"5 foos"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			_, err := ParseDuration(tt.input)
			if err == nil {
				t.Errorf("ParseDuration(%q) should have returned error", tt.input)
			}
		})
	}
}

func TestHumanDate(t *testing.T) {
	ref := int64(1705276800) // 2024-01-15 Monday 00:00 UTC

	tests := []struct {
		timestamp int64
		expected  string
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
		t.Run(tt.expected, func(t *testing.T) {
			got := HumanDate(tt.timestamp, ref)
			if got != tt.expected {
				t.Errorf("HumanDate(%d, %d) = %q, want %q", tt.timestamp, ref, got, tt.expected)
			}
		})
	}
}

func TestDateRange(t *testing.T) {
	tests := []struct {
		start    int64
		end      int64
		expected string
	}{
		{1705276800, 1705276800, "January 15, 2024"},
		{1705276800, 1705320000, "January 15, 2024"},
		{1705276800, 1705363200, "January 15\u201316, 2024"},
		{1705276800, 1705881600, "January 15\u201322, 2024"},
		{1705276800, 1707955200, "January 15 \u2013 February 15, 2024"},
		{1703721600, 1705276800, "December 28, 2023 \u2013 January 15, 2024"},
		{1704067200, 1735603200, "January 1 \u2013 December 31, 2024"},
		{1705881600, 1705276800, "January 15\u201322, 2024"},
		{1672531200, 1735689600, "January 1, 2023 \u2013 January 1, 2025"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			got := DateRange(tt.start, tt.end)
			if got != tt.expected {
				t.Errorf("DateRange(%d, %d) = %q, want %q", tt.start, tt.end, got, tt.expected)
			}
		})
	}
}
