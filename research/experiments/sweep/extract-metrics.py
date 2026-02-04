#!/usr/bin/env python3
"""
Extract structured metrics from a sweep run's subagent JSONL logs.

Usage:
  python3 extract-metrics.py <run_dir> [--subagent-dir <path>]

The script reads the subagent JSONL log for the run, extracts token usage,
timestamps, and cost data, then writes metrics.json to the run directory.

If --subagent-dir is not provided, the script looks for a subagent log path
recorded in <run_dir>/agent-info.json (written by the orchestrator).
"""
import json
import os
import sys
import glob
from datetime import datetime

CHARS_PER_TOKEN = 4  # rough heuristic for code output

PRICING = {
    "claude-sonnet-4-5-20250929": {
        "input_per_mtok": 3.00,
        "cache_write_per_mtok": 3.75,
        "cache_read_per_mtok": 0.30,
        "output_per_mtok": 15.00,
    },
    "claude-opus-4-5-20251101": {
        "input_per_mtok": 5.00,
        "cache_write_per_mtok": 6.25,
        "cache_read_per_mtok": 0.50,
        "output_per_mtok": 25.00,
    },
}


def extract_from_jsonl(jsonl_path):
    """Extract token usage and timestamps from a subagent JSONL log."""
    with open(jsonl_path) as f:
        lines = [json.loads(l) for l in f if l.strip()]

    # Deduplicate assistant messages by ID, keeping entry with most content
    msg_data = {}
    timestamps = []

    for obj in lines:
        ts = obj.get("timestamp")
        if ts:
            timestamps.append(ts)

        if obj.get("type") != "assistant":
            continue
        msg = obj.get("message", {})
        msg_id = msg.get("id", "")
        if not msg_id:
            continue

        usage = msg.get("usage", {})
        content = msg.get("content", [])

        total_chars = 0
        for item in content:
            t = item.get("type")
            if t == "text":
                total_chars += len(item.get("text", ""))
            elif t == "tool_use":
                total_chars += len(json.dumps(item.get("input", {})))
            elif t == "thinking":
                total_chars += len(item.get("thinking", ""))

        if msg_id not in msg_data or total_chars > msg_data[msg_id]["total_chars"]:
            msg_data[msg_id] = {
                "usage": usage,
                "total_chars": total_chars,
            }

    # Aggregate
    total_input_fresh = 0
    total_cache_write = 0
    total_cache_read = 0
    total_output_chars = 0

    for data in msg_data.values():
        u = data["usage"]
        total_input_fresh += u.get("input_tokens", 0)
        total_cache_write += u.get("cache_creation_input_tokens", 0)
        total_cache_read += u.get("cache_read_input_tokens", 0)
        total_output_chars += data["total_chars"]

    estimated_output = total_output_chars // CHARS_PER_TOKEN

    # Timestamps
    wall_clock = None
    ts_start = None
    ts_end = None
    if timestamps:
        timestamps.sort()
        ts_start = timestamps[0]
        ts_end = timestamps[-1]
        try:
            t0 = datetime.fromisoformat(ts_start.replace("Z", "+00:00"))
            t1 = datetime.fromisoformat(ts_end.replace("Z", "+00:00"))
            wall_clock = (t1 - t0).total_seconds()
        except Exception:
            pass

    return {
        "api_calls": len(msg_data),
        "input_fresh": total_input_fresh,
        "cache_write": total_cache_write,
        "cache_read": total_cache_read,
        "output_estimated": estimated_output,
        "output_chars": total_output_chars,
        "total": total_input_fresh + total_cache_write + total_cache_read + estimated_output,
        "timestamp_start": ts_start,
        "timestamp_end": ts_end,
        "wall_clock_seconds": wall_clock,
    }


def compute_cost(tokens, model_id):
    """Compute estimated cost in USD."""
    rates = PRICING.get(model_id)
    if not rates:
        return None

    cost = (
        (tokens["input_fresh"] / 1_000_000) * rates["input_per_mtok"]
        + (tokens["cache_write"] / 1_000_000) * rates["cache_write_per_mtok"]
        + (tokens["cache_read"] / 1_000_000) * rates["cache_read_per_mtok"]
        + (tokens["output_estimated"] / 1_000_000) * rates["output_per_mtok"]
    )
    return round(cost, 4)


def build_metrics(run_dir, subagent_jsonl=None):
    """Build metrics.json for a run directory."""
    # Load run config info
    agent_info_path = os.path.join(run_dir, "agent-info.json")
    if os.path.exists(agent_info_path):
        with open(agent_info_path) as f:
            agent_info = json.load(f)
    else:
        agent_info = {}

    run_id = agent_info.get("run_id", os.path.basename(run_dir))

    # Find JSONL log
    if not subagent_jsonl:
        subagent_jsonl = agent_info.get("jsonl_path")
    if not subagent_jsonl:
        # Try to find it by agent ID
        agent_id = agent_info.get("agent_id")
        if agent_id:
            # Search common subagent directories
            home = os.path.expanduser("~")
            pattern = os.path.join(home, ".claude/projects/*/*/subagents", f"{agent_id}.jsonl")
            matches = glob.glob(pattern)
            if matches:
                subagent_jsonl = matches[0]

    if not subagent_jsonl or not os.path.exists(subagent_jsonl):
        print(f"WARNING: No JSONL log found for {run_id}", file=sys.stderr)
        return None

    tokens = extract_from_jsonl(subagent_jsonl)

    model_id = agent_info.get("model_id", "claude-sonnet-4-5-20250929")
    cost = compute_cost(tokens, model_id)

    # Load test results if available
    test_results_path = os.path.join(run_dir, "test-results.json")
    test_results = {}
    if os.path.exists(test_results_path):
        with open(test_results_path) as f:
            test_results = json.load(f)

    metrics = {
        "run_id": run_id,
        "skill": agent_info.get("skill", ""),
        "subgraph": agent_info.get("subgraph", ""),
        "nodes": agent_info.get("nodes", []),
        "language": agent_info.get("language", ""),
        "model": model_id,
        "hints_available": agent_info.get("hints", False),
        "timestamp_start": tokens["timestamp_start"],
        "timestamp_end": tokens["timestamp_end"],
        "wall_clock_seconds": tokens["wall_clock_seconds"],
        "first_pass": test_results.get("first_pass", {}),
        "iterations": test_results.get("iterations", None),
        "tokens": {
            "input_fresh": tokens["input_fresh"],
            "cache_write": tokens["cache_write"],
            "cache_read": tokens["cache_read"],
            "output_estimated": tokens["output_estimated"],
            "total": tokens["total"],
        },
        "cost_usd": cost,
        "external_dependencies": test_results.get("external_dependencies", None),
        "hints_consulted": test_results.get("hints_consulted", None),
        "reference_consulted": test_results.get("reference_consulted", None),
        "test_count": test_results.get("test_count", None),
    }

    out_path = os.path.join(run_dir, "metrics.json")
    with open(out_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Wrote {out_path}")
    return metrics


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract-metrics.py <run_dir> [--subagent-dir <path>]", file=sys.stderr)
        sys.exit(1)

    run_dir = sys.argv[1]
    subagent_jsonl = None
    if "--subagent-dir" in sys.argv:
        idx = sys.argv.index("--subagent-dir")
        if idx + 1 < len(sys.argv):
            subagent_jsonl = sys.argv[idx + 1]

    build_metrics(run_dir, subagent_jsonl)
