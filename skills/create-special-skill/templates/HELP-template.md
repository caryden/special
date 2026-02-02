# {{SKILL_TITLE}} — Help Guide

This guide helps you choose the right nodes and target language for your use case.

## Quick Start

If you already know what you need:
- **Minimal**: `{{minimal-subset-nodes}} --lang <language>`
- **Common**: `{{common-subset-nodes}} --lang <language>`
- **Full library**: `all --lang <language>`

## Decision Tree

Walk through these questions to determine which nodes you need.

### 1. What is your use case?

{{For each major use case, describe it and map to a node recipe.}}

| Use Case | Recommended Nodes | Why |
|----------|------------------|-----|
| {{use-case-1}} | `{{nodes}}` | {{rationale}} |
| {{use-case-2}} | `{{nodes}}` | {{rationale}} |
| {{use-case-3}} | `{{nodes}}` | {{rationale}} |

### 2. What information do you have available?

{{Different node choices depending on whether the user has gradients,
Hessians, constraints, etc.}}

| Available Info | Best Choice | Nodes |
|---------------|-------------|-------|
| {{info-type-1}} | {{algorithm}} | `{{nodes}}` |
| {{info-type-2}} | {{algorithm}} | `{{nodes}}` |

### 3. What language / platform?

| Language | Notes |
|----------|-------|
| Python | {{idioms, packaging, performance notes}} |
| Rust | {{idioms, packaging, performance notes}} |
| Go | {{idioms, packaging, performance notes}} |
| TypeScript | {{idioms, packaging, performance notes}} |
| Other | Translation hints exist for the above; for other languages, the spec.md and reference source provide enough detail to translate manually |

## Node Recipes

Pre-computed dependency sets for common subsets. Copy-paste these directly.

### {{Recipe 1 Name}}

```
{{node-a}} {{node-b}} {{node-c}} --lang <language>
```

{{1-2 sentence description of what this gives you and when to use it.}}

### {{Recipe 2 Name}}

```
{{node-d}} {{node-e}} --lang <language>
```

{{1-2 sentence description.}}

## Frequently Asked Questions

**Q: Do I need `test-functions`?**
A: Only for validation. The test-functions node provides standard test cases used
during development. You don't need it in production — your own objective functions
replace it.

**Q: Can I add nodes later?**
A: Yes. Each node is self-contained with explicit dependencies. Generate additional
nodes at any time — just include their dependencies.

**Q: What if my language isn't listed?**
A: The spec.md files are language-agnostic behavioral specifications with test
vectors. Any language can implement them. The to-<lang>.md hints just accelerate
translation for the listed languages.
