// when-words benchmark — Go
//
// Measures wall-clock time for each root node.
// Outputs NDJSON, one line per node.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"whenwords"
)

type wallClock struct {
	Min    float64 `json:"min"`
	Median float64 `json:"median"`
	P95    float64 `json:"p95"`
	Max    float64 `json:"max"`
}

type benchResult struct {
	Node        string    `json:"node"`
	Language    string    `json:"language"`
	Iterations  int       `json:"iterations"`
	Warmup      int       `json:"warmup"`
	WallClockMs wallClock `json:"wall_clock_ms"`
	Correctness bool      `json:"correctness"`
}

func benchmarkNode(name string, iterations, warmup int, fn func(), check func() bool) {
	correct := check()
	if !correct {
		fmt.Fprintf(os.Stderr, "FAIL: %s correctness check failed\n", name)
		os.Exit(1)
	}

	for i := 0; i < warmup; i++ {
		fn()
	}

	times := make([]float64, iterations)
	for i := 0; i < iterations; i++ {
		t0 := time.Now()
		fn()
		times[i] = float64(time.Since(t0).Nanoseconds()) / 1_000_000
	}

	sort.Float64s(times)

	result := benchResult{
		Node:       name,
		Language:   "go",
		Iterations: iterations,
		Warmup:     warmup,
		WallClockMs: wallClock{
			Min:    times[0],
			Median: times[len(times)/2],
			P95:    times[int(float64(len(times))*0.95)],
			Max:    times[len(times)-1],
		},
		Correctness: correct,
	}

	b, _ := json.Marshal(result)
	fmt.Println(string(b))
}

func main() {
	benchmarkNode(
		"time-ago",
		100000,
		10000,
		func() { whenwords.TimeAgo(1704067200, 1704153600) },
		func() bool { return whenwords.TimeAgo(1704067200, 1704153600) == "1 day ago" },
	)

	benchmarkNode(
		"duration",
		100000,
		10000,
		func() { whenwords.Duration(90061, false, 2) },
		func() bool { return whenwords.Duration(90061, false, 2) == "1 day, 1 hour" },
	)

	benchmarkNode(
		"parse-duration",
		100000,
		10000,
		func() { whenwords.ParseDuration("1 day, 2 hours and 30 minutes") },
		func() bool {
			r, err := whenwords.ParseDuration("1 day, 2 hours and 30 minutes")
			return err == nil && r == 95400
		},
	)

	benchmarkNode(
		"human-date",
		100000,
		10000,
		func() { whenwords.HumanDate(1704067200, 1704153600) },
		func() bool { return whenwords.HumanDate(1704067200, 1704153600) == "Yesterday" },
	)

	benchmarkNode(
		"date-range",
		100000,
		10000,
		func() { whenwords.DateRange(1705276800, 1705881600) },
		func() bool { return strings.Contains(whenwords.DateRange(1705276800, 1705881600), "January") },
	)
}
