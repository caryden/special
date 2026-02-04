#!/usr/bin/env python3
"""
Aggregate sweep run metrics into summary markdown tables.

Usage:
  python3 aggregate-results.py

Reads all metrics.json files from runs/ subdirectories and generates:
  - results/summary.md         — Full results table
  - results/by-language.md     — Language comparison
  - results/by-subgraph.md     — Scaling analysis
  - results/hint-ablation.md   — Hinted vs unhinted
  - results/model-comparison.md — Sonnet vs Opus
  - results/cost-projections.md — CI pre-cache estimates
"""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
RUNS_DIR = SCRIPT_DIR / "runs"
RESULTS_DIR = SCRIPT_DIR / "results"


def load_all_metrics():
    """Load all metrics.json files from run directories."""
    metrics = []
    if not RUNS_DIR.exists():
        return metrics
    for run_dir in sorted(RUNS_DIR.iterdir()):
        mpath = run_dir / "metrics.json"
        if mpath.exists():
            with open(mpath) as f:
                m = json.load(f)
                metrics.append(m)
    return metrics


def fmt_tokens(n):
    if n is None:
        return "—"
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)


def fmt_cost(c):
    if c is None:
        return "—"
    return f"${c:.2f}"


def fmt_rate(r):
    if r is None:
        return "—"
    return f"{r:.1%}"


def fmt_time(s):
    if s is None:
        return "—"
    if s >= 3600:
        return f"{s/3600:.1f}h"
    if s >= 60:
        return f"{s/60:.1f}m"
    return f"{s:.0f}s"


def write_summary(metrics):
    """Write full results summary table."""
    lines = ["# Sweep Results Summary\n"]
    lines.append(f"**Runs completed:** {len(metrics)}\n")
    total_cost = sum(m.get("cost_usd", 0) or 0 for m in metrics)
    lines.append(f"**Total estimated cost:** {fmt_cost(total_cost)}\n")

    lines.append("| Run ID | Skill | Subgraph | Lang | Model | Hints | Pass Rate | Iters | Tokens | Cost | Wall |")
    lines.append("|--------|-------|----------|------|-------|-------|-----------|-------|--------|------|------|")

    for m in sorted(metrics, key=lambda x: (x.get("skill", ""), x.get("subgraph", ""), x.get("language", ""))):
        fp = m.get("first_pass", {})
        rate = fp.get("pass_rate")
        lines.append(
            f"| {m['run_id']} "
            f"| {m.get('skill', '')} "
            f"| {m.get('subgraph', '')} "
            f"| {m.get('language', '')} "
            f"| {'Opus' if 'opus' in m.get('model', '') else 'Sonnet'} "
            f"| {'✓' if m.get('hints_available') else '✗'} "
            f"| {fmt_rate(rate)} "
            f"| {m.get('iterations', '—')} "
            f"| {fmt_tokens(m.get('tokens', {}).get('total'))} "
            f"| {fmt_cost(m.get('cost_usd'))} "
            f"| {fmt_time(m.get('wall_clock_seconds'))} |"
        )

    path = RESULTS_DIR / "summary.md"
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {path}")


def write_by_language(metrics):
    """Write language comparison table."""
    by_lang = defaultdict(list)
    for m in metrics:
        by_lang[m.get("language", "unknown")].append(m)

    lines = ["# Results by Language\n"]
    lines.append("| Language | Runs | Avg Pass Rate | Avg Iterations | Avg Tokens | Avg Cost | Avg Wall |")
    lines.append("|----------|------|---------------|----------------|------------|----------|----------|")

    for lang in sorted(by_lang.keys()):
        runs = by_lang[lang]
        n = len(runs)
        rates = [m["first_pass"]["pass_rate"] for m in runs if m.get("first_pass", {}).get("pass_rate") is not None]
        iters = [m["iterations"] for m in runs if m.get("iterations") is not None]
        tokens = [m["tokens"]["total"] for m in runs if m.get("tokens", {}).get("total") is not None]
        costs = [m["cost_usd"] for m in runs if m.get("cost_usd") is not None]
        walls = [m["wall_clock_seconds"] for m in runs if m.get("wall_clock_seconds") is not None]

        lines.append(
            f"| {lang} | {n} "
            f"| {fmt_rate(sum(rates)/len(rates)) if rates else '—'} "
            f"| {sum(iters)/len(iters):.1f if iters else '—'} "
            f"| {fmt_tokens(int(sum(tokens)/len(tokens))) if tokens else '—'} "
            f"| {fmt_cost(sum(costs)/len(costs)) if costs else '—'} "
            f"| {fmt_time(sum(walls)/len(walls)) if walls else '—'} |"
        )

    path = RESULTS_DIR / "by-language.md"
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {path}")


def write_by_subgraph(metrics):
    """Write subgraph scaling analysis."""
    by_sub = defaultdict(list)
    for m in metrics:
        by_sub[m.get("subgraph", "unknown")].append(m)

    size_order = {"small": 0, "medium": 1, "large": 2, "full": 3, "mathexpr-full": 4, "whenwords-full": 5}
    lines = ["# Results by Subgraph Size\n"]
    lines.append("| Subgraph | Runs | Avg Pass Rate | Avg Iterations | Avg Tokens | Avg Cost |")
    lines.append("|----------|------|---------------|----------------|------------|----------|")

    for sub in sorted(by_sub.keys(), key=lambda x: size_order.get(x, 99)):
        runs = by_sub[sub]
        n = len(runs)
        rates = [m["first_pass"]["pass_rate"] for m in runs if m.get("first_pass", {}).get("pass_rate") is not None]
        iters = [m["iterations"] for m in runs if m.get("iterations") is not None]
        tokens = [m["tokens"]["total"] for m in runs if m.get("tokens", {}).get("total") is not None]
        costs = [m["cost_usd"] for m in runs if m.get("cost_usd") is not None]

        lines.append(
            f"| {sub} | {n} "
            f"| {fmt_rate(sum(rates)/len(rates)) if rates else '—'} "
            f"| {sum(iters)/len(iters):.1f if iters else '—'} "
            f"| {fmt_tokens(int(sum(tokens)/len(tokens))) if tokens else '—'} "
            f"| {fmt_cost(sum(costs)/len(costs)) if costs else '—'} |"
        )

    path = RESULTS_DIR / "by-subgraph.md"
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {path}")


def write_hint_ablation(metrics):
    """Write hint ablation analysis."""
    hinted = [m for m in metrics if m.get("hints_available")]
    unhinted = [m for m in metrics if not m.get("hints_available")]

    lines = ["# Hint Ablation Analysis\n"]
    lines.append("Compares languages with translation hints (Python, Rust, Go) vs without (C#, Kotlin, C++, Swift).\n")

    for label, group in [("Hinted (Python/Rust/Go)", hinted), ("Unhinted (C#/Kotlin/C++/Swift)", unhinted)]:
        lines.append(f"\n## {label}\n")
        if not group:
            lines.append("No data.\n")
            continue

        rates = [m["first_pass"]["pass_rate"] for m in group if m.get("first_pass", {}).get("pass_rate") is not None]
        iters = [m["iterations"] for m in group if m.get("iterations") is not None]
        tokens = [m["tokens"]["total"] for m in group if m.get("tokens", {}).get("total") is not None]
        costs = [m["cost_usd"] for m in group if m.get("cost_usd") is not None]

        lines.append(f"- **Runs:** {len(group)}")
        lines.append(f"- **Avg first-pass rate:** {fmt_rate(sum(rates)/len(rates)) if rates else '—'}")
        lines.append(f"- **Avg iterations:** {sum(iters)/len(iters):.1f}" if iters else "- **Avg iterations:** —")
        lines.append(f"- **Avg tokens:** {fmt_tokens(int(sum(tokens)/len(tokens))) if tokens else '—'}")
        lines.append(f"- **Avg cost:** {fmt_cost(sum(costs)/len(costs)) if costs else '—'}")

    # Paired comparison on same subgraphs
    lines.append("\n## Paired Comparison (same subgraph)\n")
    lines.append("| Subgraph | Hinted Avg Rate | Unhinted Avg Rate | Hinted Avg Iters | Unhinted Avg Iters |")
    lines.append("|----------|-----------------|-------------------|------------------|--------------------|")

    subgraphs_with_both = set()
    for m in hinted:
        sub = m.get("subgraph")
        if any(u.get("subgraph") == sub for u in unhinted):
            subgraphs_with_both.add(sub)

    for sub in sorted(subgraphs_with_both):
        h = [m for m in hinted if m.get("subgraph") == sub]
        u = [m for m in unhinted if m.get("subgraph") == sub]
        h_rates = [m["first_pass"]["pass_rate"] for m in h if m.get("first_pass", {}).get("pass_rate") is not None]
        u_rates = [m["first_pass"]["pass_rate"] for m in u if m.get("first_pass", {}).get("pass_rate") is not None]
        h_iters = [m["iterations"] for m in h if m.get("iterations") is not None]
        u_iters = [m["iterations"] for m in u if m.get("iterations") is not None]

        lines.append(
            f"| {sub} "
            f"| {fmt_rate(sum(h_rates)/len(h_rates)) if h_rates else '—'} "
            f"| {fmt_rate(sum(u_rates)/len(u_rates)) if u_rates else '—'} "
            f"| {sum(h_iters)/len(h_iters):.1f if h_iters else '—'} "
            f"| {sum(u_iters)/len(u_iters):.1f if u_iters else '—'} |"
        )

    path = RESULTS_DIR / "hint-ablation.md"
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {path}")


def write_model_comparison(metrics):
    """Write Sonnet vs Opus comparison."""
    sonnet = [m for m in metrics if "sonnet" in m.get("model", "")]
    opus = [m for m in metrics if "opus" in m.get("model", "")]

    lines = ["# Model Comparison: Sonnet 4.5 vs Opus 4.5\n"]
    lines.append("Comparing on medium BFGS subgraph (5 nodes, ~400 impl lines).\n")

    lines.append("| Language | Model | Pass Rate | Iterations | Tokens | Cost | Wall |")
    lines.append("|----------|-------|-----------|------------|--------|------|------|")

    # Match by language
    opus_langs = {m["language"]: m for m in opus if m.get("subgraph") == "medium"}
    sonnet_langs = {m["language"]: m for m in sonnet if m.get("subgraph") == "medium"}

    for lang in sorted(set(list(opus_langs.keys()) + list(sonnet_langs.keys()))):
        for model_label, lookup in [("Sonnet", sonnet_langs), ("Opus", opus_langs)]:
            m = lookup.get(lang)
            if not m:
                continue
            fp = m.get("first_pass", {})
            lines.append(
                f"| {lang} | {model_label} "
                f"| {fmt_rate(fp.get('pass_rate'))} "
                f"| {m.get('iterations', '—')} "
                f"| {fmt_tokens(m.get('tokens', {}).get('total'))} "
                f"| {fmt_cost(m.get('cost_usd'))} "
                f"| {fmt_time(m.get('wall_clock_seconds'))} |"
            )

    path = RESULTS_DIR / "model-comparison.md"
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {path}")


def write_cost_projections(metrics):
    """Write CI cost projection estimates."""
    lines = ["# CI Cost Projections\n"]
    lines.append("Projected cost to pre-cache translations for all languages in CI.\n")

    # Group by (subgraph, language) to get per-cell costs
    by_key = {}
    for m in metrics:
        key = (m.get("subgraph", ""), m.get("language", ""))
        by_key[key] = m

    # Project: for each subgraph, what would it cost to translate to all 8 languages?
    subgraphs = sorted(set(m.get("subgraph", "") for m in metrics))
    languages = sorted(set(m.get("language", "") for m in metrics))

    lines.append("## Per-Cell Cost Matrix\n")
    header = "| Subgraph | " + " | ".join(languages) + " |"
    sep = "|----------|" + "|".join(["------" for _ in languages]) + "|"
    lines.append(header)
    lines.append(sep)

    for sub in subgraphs:
        row = f"| {sub} "
        for lang in languages:
            m = by_key.get((sub, lang))
            if m:
                row += f"| {fmt_cost(m.get('cost_usd'))} "
            else:
                row += "| — "
        row += "|"
        lines.append(row)

    # Summary: total cost for a full CI sweep
    lines.append("\n## Estimated Full CI Sweep Cost\n")
    total = sum(m.get("cost_usd", 0) or 0 for m in metrics)
    lines.append(f"Total observed cost across {len(metrics)} runs: **{fmt_cost(total)}**\n")

    # Average cost per language
    lines.append("### Average Cost per Language\n")
    by_lang = defaultdict(list)
    for m in metrics:
        if m.get("cost_usd") is not None:
            by_lang[m["language"]].append(m["cost_usd"])

    for lang in sorted(by_lang.keys()):
        costs = by_lang[lang]
        lines.append(f"- **{lang}:** {fmt_cost(sum(costs)/len(costs))} avg across {len(costs)} runs")

    path = RESULTS_DIR / "cost-projections.md"
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {path}")


def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    metrics = load_all_metrics()
    if not metrics:
        print("No metrics.json files found in runs/", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(metrics)} run(s)\n")
    write_summary(metrics)
    write_by_language(metrics)
    write_by_subgraph(metrics)
    write_hint_ablation(metrics)
    write_model_comparison(metrics)
    write_cost_projections(metrics)
    print("\nDone.")


if __name__ == "__main__":
    main()
