"""
Cross-validate PROMPT implementations against the REF test vectors.
This checks whether implementations built from natural language descriptions
produce the same outputs as the Type-O reference for all 124 test cases.
"""
import sys
import importlib.util

def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

REF_TIME_AGO = 1704067200
REF_HUMAN_DATE = 1705276800

TIME_AGO_TESTS = [
    # Past
    (1704067200, "just now"), (1704067170, "just now"), (1704067156, "just now"),
    (1704067155, "1 minute ago"), (1704067111, "1 minute ago"),
    (1704067110, "2 minutes ago"), (1704065400, "30 minutes ago"),
    (1704064560, "44 minutes ago"), (1704064500, "1 hour ago"),
    (1704061860, "1 hour ago"), (1704061800, "2 hours ago"),
    (1704049200, "5 hours ago"), (1703991600, "21 hours ago"),
    (1703988000, "1 day ago"), (1703941200, "1 day ago"),
    (1703937600, "2 days ago"), (1703462400, "7 days ago"),
    (1701907200, "25 days ago"), (1701820800, "1 month ago"),
    (1700179200, "1 month ago"), (1700092800, "2 months ago"),
    (1688169600, "6 months ago"), (1676505600, "11 months ago"),
    (1676419200, "1 year ago"), (1656806400, "1 year ago"),
    (1656720000, "2 years ago"), (1546300800, "5 years ago"),
    # Future
    (1704067230, "just now"), (1704067260, "in 1 minute"),
    (1704067500, "in 5 minutes"), (1704070200, "in 1 hour"),
    (1704078000, "in 3 hours"), (1704150000, "in 1 day"),
    (1704240000, "in 2 days"), (1706745600, "in 1 month"),
    (1735689600, "in 1 year"),
]

DURATION_TESTS = [
    (0, False, 2, "0 seconds"), (1, False, 2, "1 second"),
    (45, False, 2, "45 seconds"), (60, False, 2, "1 minute"),
    (90, False, 2, "1 minute, 30 seconds"), (120, False, 2, "2 minutes"),
    (3600, False, 2, "1 hour"), (3661, False, 2, "1 hour, 1 minute"),
    (5400, False, 2, "1 hour, 30 minutes"), (9000, False, 2, "2 hours, 30 minutes"),
    (86400, False, 2, "1 day"), (93600, False, 2, "1 day, 2 hours"),
    (604800, False, 2, "7 days"), (2592000, False, 2, "1 month"),
    (31536000, False, 2, "1 year"), (36720000, False, 2, "1 year, 2 months"),
    (0, True, 2, "0s"), (45, True, 2, "45s"), (3661, True, 2, "1h 1m"),
    (9000, True, 2, "2h 30m"), (93600, True, 2, "1d 2h"),
    (3661, False, 1, "1 hour"), (93600, False, 1, "1 day"),
    (93661, False, 3, "1 day, 2 hours, 1 minute"),
    (9000, True, 1, "3h"),
]

PARSE_DURATION_TESTS = [
    ("2h30m", 9000), ("2h 30m", 9000), ("2h, 30m", 9000),
    ("1.5h", 5400), ("90m", 5400), ("90min", 5400),
    ("45s", 45), ("45sec", 45), ("2d", 172800), ("1w", 604800),
    ("1d 2h 30m", 95400), ("2hr", 7200), ("2hrs", 7200), ("30mins", 1800),
    ("2 hours 30 minutes", 9000), ("2 hours and 30 minutes", 9000),
    ("2 hours, and 30 minutes", 9000), ("2.5 hours", 9000),
    ("90 minutes", 5400), ("2 days", 172800), ("1 week", 604800),
    ("1 day, 2 hours, and 30 minutes", 95400), ("45 seconds", 45),
    ("2:30", 9000), ("1:30:00", 5400), ("0:05:30", 330),
    ("2H 30M", 9000), ("  2 hours   30 minutes  ", 9000),
]

HUMAN_DATE_TESTS = [
    (1705276800, "Today"), (1705320000, "Today"),
    (1705190400, "Yesterday"), (1705363200, "Tomorrow"),
    (1705104000, "Last Saturday"), (1705017600, "Last Friday"),
    (1704931200, "Last Thursday"), (1704844800, "Last Wednesday"),
    (1704758400, "Last Tuesday"),
    (1704672000, "January 8"),
    (1705449600, "This Wednesday"), (1705536000, "This Thursday"),
    (1705795200, "This Sunday"),
    (1705881600, "January 22"),
    (1709251200, "March 1"), (1735603200, "December 31"),
    (1672531200, "January 1, 2023"), (1736121600, "January 6, 2025"),
]

DATE_RANGE_TESTS = [
    (1705276800, 1705276800, "January 15, 2024"),
    (1705276800, 1705320000, "January 15, 2024"),
    (1705276800, 1705363200, "January 15\u201316, 2024"),
    (1705276800, 1705881600, "January 15\u201322, 2024"),
    (1705276800, 1707955200, "January 15 \u2013 February 15, 2024"),
    (1703721600, 1705276800, "December 28, 2023 \u2013 January 15, 2024"),
    (1704067200, 1735603200, "January 1 \u2013 December 31, 2024"),
    (1705881600, 1705276800, "January 15\u201322, 2024"),
    (1672531200, 1735689600, "January 1, 2023 \u2013 January 1, 2025"),
]

def test_implementation(label, mod):
    passed = 0
    failed = 0
    errors = []

    # timeAgo / time_ago
    time_ago_fn = getattr(mod, 'time_ago', None) or getattr(mod, 'timeAgo', None)
    if time_ago_fn:
        for ts, expected in TIME_AGO_TESTS:
            try:
                result = time_ago_fn(ts, REF_TIME_AGO)
                if result == expected:
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  time_ago({ts}): expected={expected!r}, got={result!r}")
            except Exception as e:
                failed += 1
                errors.append(f"  time_ago({ts}): EXCEPTION {e}")

    # duration
    duration_fn = getattr(mod, 'duration', None)
    if duration_fn:
        for secs, compact, max_units, expected in DURATION_TESTS:
            try:
                result = duration_fn(secs, compact=compact, max_units=max_units)
                if result == expected:
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  duration({secs}, compact={compact}, max_units={max_units}): expected={expected!r}, got={result!r}")
            except Exception as e:
                failed += 1
                errors.append(f"  duration({secs}, ...): EXCEPTION {e}")

    # parseDuration / parse_duration
    parse_fn = getattr(mod, 'parse_duration', None) or getattr(mod, 'parseDuration', None)
    if parse_fn:
        for inp, expected in PARSE_DURATION_TESTS:
            try:
                result = parse_fn(inp)
                if result == expected:
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  parse_duration({inp!r}): expected={expected}, got={result}")
            except Exception as e:
                failed += 1
                errors.append(f"  parse_duration({inp!r}): EXCEPTION {e}")

    # humanDate / human_date
    human_date_fn = getattr(mod, 'human_date', None) or getattr(mod, 'humanDate', None)
    if human_date_fn:
        for ts, expected in HUMAN_DATE_TESTS:
            try:
                result = human_date_fn(ts, REF_HUMAN_DATE)
                if result == expected:
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  human_date({ts}): expected={expected!r}, got={result!r}")
            except Exception as e:
                failed += 1
                errors.append(f"  human_date({ts}): EXCEPTION {e}")

    # dateRange / date_range
    date_range_fn = getattr(mod, 'date_range', None) or getattr(mod, 'dateRange', None)
    if date_range_fn:
        for start, end, expected in DATE_RANGE_TESTS:
            try:
                result = date_range_fn(start, end)
                if result == expected:
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  date_range({start}, {end}): expected={expected!r}, got={result!r}")
            except Exception as e:
                failed += 1
                errors.append(f"  date_range({start}, {end}): EXCEPTION {e}")

    total = passed + failed
    print(f"\n{'='*60}")
    print(f"{label}: {passed}/{total} passed ({failed} failures)")
    print(f"{'='*60}")
    if errors:
        for e in errors[:20]:
            print(e)
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more failures")
    return passed, total, errors


if __name__ == "__main__":
    results = {}

    for variant in ["prompt-python", "spec-python", "ref-python"]:
        path = f"/home/user/special/experiments/whenwords-{variant}/whenwords.py"
        try:
            mod = load_module(path, f"whenwords_{variant.replace('-','_')}")
            p, t, errs = test_implementation(variant, mod)
            results[variant] = (p, t, errs)
        except Exception as e:
            print(f"\n{variant}: FAILED TO LOAD — {e}")
            results[variant] = (0, 0, [str(e)])

    print("\n\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for variant, (p, t, errs) in results.items():
        status = "PASS" if p == t and t > 0 else "FAIL"
        print(f"  {variant}: {p}/{t} [{status}]")
