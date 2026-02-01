#!/usr/bin/env python3
"""
Extract token usage from mathexpr subagent JSONL logs.
"""
import json
import os

AGENT_MAP = {
    "agent-a069bff": "REF → Python",
    "agent-a4441a0": "REF → Rust",
    "agent-a0e0c8f": "REF → Go",
    "agent-a18f52c": "SPEC → Python",
    "agent-ab70c2b": "SPEC → Rust",
    "agent-a83ac58": "SPEC → Go",
    "agent-af9ac89": "PROMPT → Python",
    "agent-aea07ab": "PROMPT → Rust",
    "agent-aee3a80": "PROMPT → Go",
}

BASE_DIRS = [
    "/root/.claude/projects/-home-user-special/1c267da8-01c0-418b-864a-b8085956cb53/subagents",
]

CHARS_PER_TOKEN = 4

results = {}

for base_dir in BASE_DIRS:
    if not os.path.isdir(base_dir):
        continue
    for fname in os.listdir(base_dir):
        if not fname.endswith(".jsonl"):
            continue
        agent_id = fname.replace(".jsonl", "")
        label = AGENT_MAP.get(agent_id)
        if not label:
            continue

        with open(os.path.join(base_dir, fname)) as f:
            lines = [json.loads(l) for l in f if l.strip()]

        msg_data = {}
        for obj in lines:
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

        api_calls = len(msg_data)
        total_input_fresh = 0
        total_cache_write = 0
        total_cache_read = 0
        total_output_chars = 0

        for msg_id, data in msg_data.items():
            u = data["usage"]
            total_input_fresh += u.get("input_tokens", 0)
            total_cache_write += u.get("cache_creation_input_tokens", 0)
            total_cache_read += u.get("cache_read_input_tokens", 0)
            total_output_chars += data["total_chars"]

        effective_input = total_input_fresh + total_cache_write + total_cache_read
        estimated_output = total_output_chars // CHARS_PER_TOKEN

        results[label] = {
            "api_calls": api_calls,
            "input_fresh": total_input_fresh,
            "cache_write": total_cache_write,
            "cache_read": total_cache_read,
            "effective_input": effective_input,
            "output_chars": total_output_chars,
            "estimated_output": estimated_output,
            "estimated_total": effective_input + estimated_output,
        }

print("Token Usage per Experiment (mathexpr)")
print("=" * 95)
print(f"{'Experiment':<20} {'Calls':>6} {'Eff.Input':>10} {'Est.Output':>10} {'Est.Total':>10} {'Out Chars':>10}")
print("-" * 95)

order = ["REF → Python", "REF → Rust", "REF → Go",
         "SPEC → Python", "SPEC → Rust", "SPEC → Go",
         "PROMPT → Python", "PROMPT → Rust", "PROMPT → Go"]
for label in order:
    if label not in results:
        print(f"{label:<20} NOT FOUND")
        continue
    r = results[label]
    print(f"{label:<20} {r['api_calls']:>6} {r['effective_input']:>10,} {r['estimated_output']:>10,} {r['estimated_total']:>10,} {r['output_chars']:>10,}")

print("\n\nSummary by Source Format")
print("=" * 75)
print(f"{'Format':<10} {'Avg Calls':>10} {'Avg Input':>12} {'Avg Est.Out':>12} {'Avg Est.Tot':>12}")
print("-" * 75)
for fmt in ["REF", "SPEC", "PROMPT"]:
    matching = [v for k, v in results.items() if k.startswith(fmt)]
    if matching:
        n = len(matching)
        print(f"{fmt:<10} {sum(v['api_calls'] for v in matching)/n:>10.1f} {sum(v['effective_input'] for v in matching)/n:>12,.0f} {sum(v['estimated_output'] for v in matching)/n:>12,.0f} {sum(v['estimated_total'] for v in matching)/n:>12,.0f}")

print("\n\nSummary by Target Language")
print("=" * 75)
print(f"{'Language':<10} {'Avg Calls':>10} {'Avg Input':>12} {'Avg Est.Out':>12} {'Avg Est.Tot':>12}")
print("-" * 75)
for lang in ["Python", "Rust", "Go"]:
    matching = [v for k, v in results.items() if k.endswith(lang)]
    if matching:
        n = len(matching)
        print(f"{lang:<10} {sum(v['api_calls'] for v in matching)/n:>10.1f} {sum(v['effective_input'] for v in matching)/n:>12,.0f} {sum(v['estimated_output'] for v in matching)/n:>12,.0f} {sum(v['estimated_total'] for v in matching)/n:>12,.0f}")

print("\n\nFormat Efficiency (relative to REF)")
print("=" * 65)
ref_vals = [v for k, v in results.items() if k.startswith("REF")]
if ref_vals:
    ref_avg_in = sum(v["effective_input"] for v in ref_vals) / len(ref_vals)
    ref_avg_out = sum(v["estimated_output"] for v in ref_vals) / len(ref_vals)
    ref_avg_tot = sum(v["estimated_total"] for v in ref_vals) / len(ref_vals)
    for fmt in ["REF", "SPEC", "PROMPT"]:
        matching = [v for k, v in results.items() if k.startswith(fmt)]
        if matching:
            n = len(matching)
            avg_in = sum(v["effective_input"] for v in matching) / n
            avg_out = sum(v["estimated_output"] for v in matching) / n
            avg_tot = sum(v["estimated_total"] for v in matching) / n
            print(f"  {fmt:<8}  input: {avg_in/ref_avg_in:.2f}x   output: {avg_out/ref_avg_out:.2f}x   total: {avg_tot/ref_avg_tot:.2f}x")
