// Math Expression Parser benchmark — Go
//
// Measures wall-clock time for the evaluate node.
// Outputs NDJSON, one line per node.
package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sort"
	"time"

	"mathexpr"
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
	expr := "((2.5 + 3.1) * 4 - 1) ** 2 / 5 + 7 % 3"
	expected := 92.592

	benchmarkNode(
		"evaluate",
		10000,
		1000,
		func() {
			mathexpr.Calc(expr)
		},
		func() bool {
			r, err := mathexpr.Calc(expr)
			if err != nil {
				return false
			}
			return math.Abs(r-expected) < 1e-6
		},
	)
}
