#!/usr/bin/env python3
"""Extract token usage from mathexpr HAIKU subagent JSONL logs."""
import json, os

AGENT_MAP = {
    "agent-a85752f": "REF → Python",
    "agent-ad4b4d6": "REF → Rust",
    "agent-a133abd": "REF → Go",
    "agent-adab6c3": "SPEC → Python",
    "agent-a829de7": "SPEC → Rust",
    "agent-ab8aefe": "SPEC → Go",
    "agent-ad71007": "PROMPT → Python",
    "agent-a3341a4": "PROMPT → Rust",
    "agent-aa525a9": "PROMPT → Go",
}

BASE_DIRS = [
    "/root/.claude/projects/-home-user-special/bfdb3c4a-1dad-43e2-83ae-e0d205569b71/subagents",
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
                msg_data[msg_id] = {"usage": usage, "total_chars": total_chars}

        api_calls = len(msg_data)
        total_input_fresh = total_cache_write = total_cache_read = total_output_chars = 0
        for data in msg_data.values():
            u = data["usage"]
            total_input_fresh += u.get("input_tokens", 0)
            total_cache_write += u.get("cache_creation_input_tokens", 0)
            total_cache_read += u.get("cache_read_input_tokens", 0)
            total_output_chars += data["total_chars"]

        effective_input = total_input_fresh + total_cache_write + total_cache_read
        estimated_output = total_output_chars // CHARS_PER_TOKEN
        results[label] = {
            "api_calls": api_calls,
            "effective_input": effective_input,
            "estimated_output": estimated_output,
            "estimated_total": effective_input + estimated_output,
            "output_chars": total_output_chars,
        }

print("Token Usage per Experiment (mathexpr — HAIKU)")
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

print("\n\nFormat Efficiency (relative to REF)")
print("=" * 65)
ref_vals = [v for k, v in results.items() if k.startswith("REF")]
if ref_vals:
    ref_avg_tot = sum(v["estimated_total"] for v in ref_vals) / len(ref_vals)
    for fmt in ["REF", "SPEC", "PROMPT"]:
        matching = [v for k, v in results.items() if k.startswith(fmt)]
        if matching:
            n = len(matching)
            avg_tot = sum(v["estimated_total"] for v in matching) / n
            print(f"  {fmt:<8}  total: {avg_tot/ref_avg_tot:.2f}x")
