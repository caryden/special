#!/usr/bin/env python3
"""
Aggregate benchmark NDJSON results and produce markdown tables for HELP.md.

Usage:
    python3 scripts/aggregate-benchmarks.py

Runs all benchmark scripts, collects NDJSON output, computes relative
performance (1.0x = median language), and prints markdown tables.
"""

import json
import os
import subprocess
import sys
from collections import defaultdict
from datetime import date, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKILLS = [
    {
        "name": "optimization",
        "path": os.path.join(ROOT, "skills", "optimization", "benchmarks"),
    },
    {
        "name": "math-expression-parser",
        "path": os.path.join(ROOT, "skills", "math-expression-parser", "benchmarks"),
    },
    {
        "name": "when-words",
        "path": os.path.join(ROOT, "skills", "when-words", "benchmarks"),
    },
]

LANG_CONFIGS = {
    "typescript": {
        "ext": "ts",
        "run": lambda path: ["bun", "run", os.path.join(path, "bench.ts")],
        "cwd": None,
    },
    "python": {
        "ext": "py",
        "run": lambda path: ["python3", os.path.join(path, "bench.py")],
        "cwd": lambda path: path,
    },
    "go": {
        "ext": "go",
        "run": lambda path: ["go", "run", "bench.go"],
        "cwd": lambda path: path,
    },
    "rust": {
        "ext": "rs",
        "run": lambda path: ["cargo", "run", "--release", "-q"],
        "cwd": lambda path: path,
    },
}


def run_benchmark(skill_path, lang):
    lang_path = os.path.join(skill_path, lang)
    if not os.path.isdir(lang_path):
        return []

    config = LANG_CONFIGS[lang]
    cmd = config["run"](lang_path)
    cwd_fn = config.get("cwd")
    cwd = cwd_fn(lang_path) if cwd_fn else None

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            cwd=cwd,
        )
        if result.returncode != 0:
            print(f"  WARN: {lang} failed: {result.stderr.strip()}", file=sys.stderr)
            return []

        entries = []
        for line in result.stdout.strip().split("\n"):
            if line.strip():
                entries.append(json.loads(line))
        return entries
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"  WARN: {lang} skipped: {e}", file=sys.stderr)
        return []


def compute_relative(results):
    """Group by (skill, node), compute median-language baseline, return relative times."""
    # results: list of dicts with skill, node, language, median_ms
    grouped = defaultdict(dict)  # (skill, node) -> {lang: median_ms}
    for r in results:
        key = (r["skill"], r["node"])
        grouped[key][r["language"]] = r["median_ms"]

    relative = defaultdict(dict)  # (skill, node) -> {lang: relative}
    for (skill, node), lang_times in grouped.items():
        values = sorted(lang_times.values())
        n = len(values)
        baseline = values[n // 2]  # median language
        if baseline == 0:
            baseline = max(values) if max(values) > 0 else 1e-6
        for lang, t in lang_times.items():
            relative[(skill, node)][lang] = round(t / baseline, 1)

    return relative


def format_table(skill_name, relative, nodes):
    """Format a markdown table for a skill."""
    # Collect all languages across all nodes for this skill
    all_langs = set()
    for node in nodes:
        key = (skill_name, node)
        if key in relative:
            all_langs.update(relative[key].keys())

    # Sort languages by average relative performance
    lang_avgs = {}
    for lang in all_langs:
        vals = []
        for node in nodes:
            key = (skill_name, node)
            if key in relative and lang in relative[key]:
                vals.append(relative[key][lang])
        lang_avgs[lang] = sum(vals) / len(vals) if vals else float("inf")

    sorted_langs = sorted(all_langs, key=lambda l: lang_avgs[l])

    # Build table
    header = "| Language |" + " | ".join(f" {n} " for n in nodes) + " |"
    sep = "|" + "|".join("-" * (len(col) + 2) for col in ["Language"] + nodes) + "|"

    rows = []
    for lang in sorted_langs:
        cells = [f" {lang.title():10s} "]
        for node in nodes:
            key = (skill_name, node)
            if key in relative and lang in relative[key]:
                val = relative[key][lang]
                cells.append(f" {val:.1f}x ")
            else:
                cells.append(" — ")
        rows.append("|" + "|".join(cells) + "|")

    lines = [header, sep] + rows
    return "\n".join(lines)


def main():
    all_results = []

    for skill in SKILLS:
        print(f"Running benchmarks for {skill['name']}...", file=sys.stderr)
        for lang in LANG_CONFIGS:
            entries = run_benchmark(skill["path"], lang)
            for entry in entries:
                all_results.append(
                    {
                        "skill": skill["name"],
                        "node": entry["node"],
                        "language": entry["language"],
                        "median_ms": entry["wall_clock_ms"]["median"],
                    }
                )

    relative = compute_relative(all_results)
    today = date.today().isoformat()

    # Group nodes by skill
    skill_nodes = defaultdict(list)
    for skill, node in relative:
        if node not in skill_nodes[skill]:
            skill_nodes[skill].append(node)

    # Sort nodes within each skill
    for skill in skill_nodes:
        skill_nodes[skill].sort()

    print(f"\n## Benchmark Results ({today})\n")

    for skill in SKILLS:
        name = skill["name"]
        nodes = skill_nodes.get(name, [])
        if not nodes:
            continue

        print(f"### {name}\n")
        print("Approximate relative wall-clock time (1.0x = median language). Lower is faster.\n")
        print(format_table(name, relative, nodes))
        print(f"\n*Measured {today}. Workloads defined in benchmark.md.*\n")

    # Also output raw NDJSON for archival
    print("\n---\n\n### Raw data (NDJSON)\n")
    print("```json")
    for r in all_results:
        print(json.dumps(r))
    print("```")


if __name__ == "__main__":
    main()
