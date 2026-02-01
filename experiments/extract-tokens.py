#!/usr/bin/env python3
"""
Extract token usage from subagent JSONL logs.

NOTE: The JSONL logs only capture the initial streaming chunk's usage per
API call — not the final usage. Output token counts from the usage field
are therefore unreliable (far too low). We estimate output tokens from
the actual content size using a ~4 chars/token heuristic, and use the
input/cache token counts which appear accurate from the first chunk.
"""
import json
import os

AGENT_MAP = {
    "agent-aa8f2b6": "REF → Python",
    "agent-a37e4f2": "REF → Rust",
    "agent-a78467e": "REF → Go",
    "agent-a11c545": "SPEC → Python",
    "agent-ab6503d": "SPEC → Rust",
    "agent-aa0c6aa": "SPEC → Go",
    "agent-a302790": "PROMPT → Python",
    "agent-a268760": "PROMPT → Rust",
    "agent-aba1b15": "PROMPT → Go",
}

BASE_DIRS = [
    "/root/.claude/projects/-home-user-special/67167f95-f5df-4995-8bbe-453bb29a4278/subagents",
    "/root/.claude/projects/-home-user-special/edd029fe-9b6b-4ee7-9ee0-57e4038c8b63/subagents",
]

CHARS_PER_TOKEN = 4  # rough heuristic for code

results = {}

for base_dir in BASE_DIRS:
    if not os.path.isdir(base_dir):
        continue
    for fname in os.listdir(base_dir):
        if not fname.endswith(".jsonl"):
            continue
        agent_id = fname.replace(".jsonl", "")
        label = AGENT_MAP.get(agent_id, agent_id)

        with open(os.path.join(base_dir, fname)) as f:
            lines = [json.loads(l) for l in f if l.strip()]

        # Deduplicate by message ID, keeping the entry with most content
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
                    "content_types": [c.get("type") for c in content],
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

# Detailed table
print("Token Usage per Experiment")
print("=" * 95)
print(f"{'Experiment':<20} {'Calls':>6} {'Eff.Input':>10} {'Est.Output':>10} {'Est.Total':>10} {'Out Chars':>10}")
print("-" * 95)

order = ["REF → Python", "REF → Rust", "REF → Go",
         "SPEC → Python", "SPEC → Rust", "SPEC → Go",
         "PROMPT → Python", "PROMPT → Rust", "PROMPT → Go"]
for label in order:
    if label not in results:
        continue
    r = results[label]
    print(f"{label:<20} {r['api_calls']:>6} {r['effective_input']:>10,} {r['estimated_output']:>10,} {r['estimated_total']:>10,} {r['output_chars']:>10,}")

# Summary by format
print("\n\nSummary by Source Format")
print("=" * 75)
print(f"{'Format':<10} {'Avg Calls':>10} {'Avg Input':>12} {'Avg Est.Out':>12} {'Avg Est.Tot':>12}")
print("-" * 75)
for fmt in ["REF", "SPEC", "PROMPT"]:
    matching = [v for k, v in results.items() if k.startswith(fmt)]
    if matching:
        n = len(matching)
        print(f"{fmt:<10} {sum(v['api_calls'] for v in matching)/n:>10.1f} {sum(v['effective_input'] for v in matching)/n:>12,.0f} {sum(v['estimated_output'] for v in matching)/n:>12,.0f} {sum(v['estimated_total'] for v in matching)/n:>12,.0f}")

# Summary by language
print("\n\nSummary by Target Language")
print("=" * 75)
print(f"{'Language':<10} {'Avg Calls':>10} {'Avg Input':>12} {'Avg Est.Out':>12} {'Avg Est.Tot':>12}")
print("-" * 75)
for lang in ["Python", "Rust", "Go"]:
    matching = [v for k, v in results.items() if k.endswith(lang)]
    if matching:
        n = len(matching)
        print(f"{lang:<10} {sum(v['api_calls'] for v in matching)/n:>10.1f} {sum(v['effective_input'] for v in matching)/n:>12,.0f} {sum(v['estimated_output'] for v in matching)/n:>12,.0f} {sum(v['estimated_total'] for v in matching)/n:>12,.0f}")

# Ratio comparison
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

print("\n\nNOTE: Output tokens estimated from content chars (÷4). Input tokens")
print("from API usage fields (accurate). Cache read/write included in input.")
