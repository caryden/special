# {{node-name}} — Spec

Depends on: {{comma-separated deps, or "none (leaf node)"}}

## Purpose

{{1-2 sentence description of what this node does.}}

## Parameters

@provenance: {{source of parameter defaults}}

| Parameter | Default | Description |
|-----------|---------|-------------|
| {{name}} | {{value}} | {{description}} |

## Algorithm

@provenance: {{source of algorithm description}}

{{Step-by-step algorithm description, if applicable.
For data-type nodes, describe the type structure instead.}}

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `{{functionName}}` | `({{params}}) → {{return}}` | {{description}} |

## Test Vectors

@provenance: {{source — e.g. "mathematical-definition", "scipy v1.17.0 empirical", "RFC 3339"}}

| Input | Expected Output |
|-------|----------------|
| {{input}} | {{output}} |

## Edge Cases

- {{edge case 1 — describe input and expected behavior}}
- {{edge case 2}}

## Error Cases

- {{error case 1 — describe input and expected error}}
