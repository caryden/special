# Codeless Libraries

Software libraries that contain no code — just specifications and test conditions.

A coding agent (Claude Code, Copilot, etc.) consumes the spec and generates a conforming implementation natively in any language, for any OS, any processor. The spec *is* the library. Code is ephemeral output.

## The Problem

Today's libraries ship code: source, binaries, platform-specific builds. This creates dependency hell, supply chain risk, version rot, and FFI friction. Meanwhile, AI coding agents can generate correct implementations on demand — if they have a clear enough spec.

## The Idea

What if a "library" was just:
1. **What it does** — behavioral specification
2. **How to verify it** — test conditions and expected outputs
3. **What it depends on** — references to other specs

No code. No language. No platform. The consumer's agent reads the spec and produces a native implementation, verified against the included tests.

Markdown + YAML (like [dbreunig's approach](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html)) works as a proof of concept, but probably isn't the optimal representation. The format should be:

- **Token-efficient** — AI agents pay per token; verbosity costs money
- **Unambiguous** — natural language specs invite interpretation drift
- **Machine-readable** — parseable without an LLM
- **Human-reviewable** — a person should be able to audit what they're asking an agent to build
- **Composable** — specs should reference other specs, building up complexity

Think of it as an IL (intermediate language) but on the *other side* of the code — not compiled output, but compiled input.

## Open Questions

- What format balances token efficiency with human readability?
- How much formalism is needed vs. how much can natural language carry?
- Should specs include algorithmic hints or just behavioral contracts?
- How do you spec stateful systems, protocols, concurrency?
- What's the right granularity — function-level? module-level? system-level?
- How do specs compose and version?
- What verification is realistic for an agent to self-check?

## Status

Brainstorming. Nothing is settled.
