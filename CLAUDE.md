# Type-O: Modular Verified References for AI-Native Code Generation

## What this is

An experiment in using annotated C# reference implementations as "universal donor"
libraries that AI agents translate into any target language. See `requirements.md`
for the full hypothesis and motivation.

## Repository structure

```
src/
  TypeO.Attributes/    — Custom C# attributes ([Node], [Contract], [TranslationHint])
  TypeO.Extract/       — Reflection-based tool that extracts subgraphs and emits translation plans
reference/
  <LibraryName>/       — Type-O reference implementations (annotated C# libraries)
  <LibraryName>.Tests/ — xUnit tests (the behavioral contracts)
docs/
  decisions/           — Architecture Decision Records (ADR-NNNN-*.md)
```

## Skills

- **build-type-o-reference** — Repeatable process for creating a new Type-O reference
  library from a spec, RFC, or existing codebase. Covers project setup, node graph
  design, annotation, testing, and validation.

- **translate-from-type-o** — Repeatable process for translating a Type-O reference
  (or subset) into a target language. Covers extraction, step-by-step translation,
  test verification, and ambiguity resolution.

## Key commands

```bash
# Build everything
dotnet build TypeO.sln

# Run tests for a reference library
dotnet test reference/<LibraryName>.Tests/

# Extract a translation plan for a specific node
dotnet run --project src/TypeO.Extract/ -- \
    reference/<LibraryName>/bin/Debug/net8.0/<LibraryName>.dll \
    <node-id> \
    --source-dir reference/<LibraryName>/

# List all nodes in a reference library
dotnet run --project src/TypeO.Extract/ -- \
    reference/<LibraryName>/bin/Debug/net8.0/<LibraryName>.dll \
    --list
```

## Conventions

- Node IDs use kebab-case: `time-ago`, `parse-duration`, `human-date`
- One test class per node, linked via `[Contract(typeof(...))]`
- Reference implementations prioritize clarity over performance
- No metaprogramming, reflection, or dynamic dispatch in reference code
- All functions are pure where possible; state and I/O are explicit
