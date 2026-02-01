---
name: {{SKILL_NAME}}
description: {{ONE_LINE_DESCRIPTION}}
argument-hint: "<nodes> [--lang <language>] — specify nodes to generate and target language (default: typescript)"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# {{SKILL_TITLE}}

{{2-3 sentence description of what this skill generates.}}

## Input

`$ARGUMENTS` accepts:
- **Nodes**: space-separated node names to generate (or `all` for the full library)
- **--lang \<language\>**: target language (default: `typescript`). Supported: `python`, `rust`, `go`, `typescript`

Examples:
- `{{EXAMPLE_NODE}}` — generate one node in TypeScript
- `{{EXAMPLE_NODE}} --lang python` — generate one node in Python
- `all --lang rust` — generate the full library in Rust

## Node Graph

```
{{ASCII_NODE_GRAPH}}
```

### Nodes

| Node | Type | Depends On | Description |
|------|------|-----------|-------------|
| `{{node-a}}` | leaf | — | {{description}} |
| `{{node-b}}` | leaf | — | {{description}} |
| `{{node-c}}` | internal | {{node-a}}, {{node-b}} | {{description}} |
| `{{root-node}}` | root | {{deps}} | {{description}} |

### Subset Extraction

- **{{Subset name}}**: `{{node-a}}` + `{{node-c}}`
- **Full library**: all {{N}} nodes

## Key Design Decisions

{{Document any defaults that differ across established libraries.
Include provenance for each choice.}}

| Parameter | Our Value | Source A | Source B |
|-----------|-----------|---------|---------|
| {{param}} | {{value}} | {{value}} | {{value}} |

## Process

1. Read this file for the node graph and design decisions
2. For each requested node (in dependency order), read `nodes/<name>/spec.md`
3. Read `nodes/<name>/to-<lang>.md` for target-language translation hints
4. Generate implementation + tests
5. If the spec is ambiguous, consult `reference/src/<name>.ts` (track what you consulted and why)
6. Run tests — all must pass before proceeding to the next node

## Error Handling

{{Document the error handling strategy for this library.}}

## Reference

The TypeScript reference implementation is in `reference/src/`. It is the
authoritative source — consult it when specs are ambiguous, but prefer the
spec and translation hints as primary sources.

All reference code has 100% line and function coverage via `bun test --coverage`.
