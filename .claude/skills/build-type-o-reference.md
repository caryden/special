# Skill: Build a Type-O Reference Library

## When to use

When the user wants to create a new Type-O reference implementation from an existing
library spec, API documentation, RFC, or behavioral description.

## Prerequisites

- .NET 8+ SDK installed
- TypeO.Attributes project available at `src/TypeO.Attributes/`

## Process

### 1. Understand the source material

Read the spec, documentation, or existing library code. Identify:
- The discrete functions/types to implement
- Dependencies between them (what calls what)
- Edge cases, error conditions, and behavioral rules
- Any existing test vectors or examples

### 2. Create the reference project

```bash
dotnet new classlib -n <LibraryName> -o reference/<LibraryName>
dotnet new xunit -n <LibraryName>.Tests -o reference/<LibraryName>.Tests
dotnet add reference/<LibraryName>/<LibraryName>.csproj reference src/TypeO.Attributes/TypeO.Attributes.csproj
dotnet add reference/<LibraryName>.Tests/<LibraryName>.Tests.csproj reference reference/<LibraryName>/<LibraryName>.csproj
```

### 3. Design the node graph

Before writing code, list the nodes and their dependencies:

```
node-id          | depends-on       | description
-----------------|------------------|---------------------------
<function-a>     | (pure)           | ...
<function-b>     | function-a       | ...
```

Granularity guidance:
- Each public function that a consumer might want independently = a node
- Shared helper functions that are only internal = part of the nearest node, not separate
- Data types shared across nodes = their own node (often a leaf)
- Error handling types = their own node (leaf)

### 4. Implement with annotations

For each node, write the reference implementation and annotate it:

```csharp
using TypeO;

[Node("my-function",
    DependsOn = new[] { "helper-a" },
    Description = "One-line description of what this does")]
[Contract(typeof(MyFunctionTests))]
[TranslationHint("Pure function, no platform concerns", Category = "pattern")]
public static ReturnType MyFunction(ParamType input) { ... }
```

Rules:
- Every public function gets a `[Node]` attribute
- Every node gets at least one `[Contract]` pointing to its test class
- Add `[TranslationHint]` only where the agent needs guidance it can't infer from the code
- Keep implementations straightforward — clarity over cleverness
- No metaprogramming, no reflection, no dynamic dispatch in reference code

### 5. Write comprehensive tests

For each node, create a test class with:
- Happy-path cases covering normal behavior
- Edge cases from the spec
- Error cases (invalid input, boundary conditions)
- Any test vectors from the source material (RFCs, specs, etc.)

Use `[Theory]` and `[InlineData]` for parameterized tests where possible — these translate
cleanly to parameterized test patterns in any target language.

### 6. Verify

```bash
dotnet build reference/<LibraryName>/<LibraryName>.csproj
dotnet test reference/<LibraryName>.Tests/<LibraryName>.Tests.csproj
```

All tests must pass. The reference implementation must be correct — it's the source of truth.

### 7. Validate extraction

```bash
dotnet run --project src/TypeO.Extract/ -- \
    reference/<LibraryName>/bin/Debug/net8.0/<LibraryName>.dll \
    <any-node-id> \
    --source-dir reference/<LibraryName>/
```

Verify the extraction tool:
- Finds all nodes
- Resolves dependencies correctly
- Topological sort is correct (leaves first)
- Translation plan looks complete

## Quality checklist

- [ ] Every public function has a `[Node]` attribute with unique ID
- [ ] Every node has at least one `[Contract]` linking to tests
- [ ] Node IDs use kebab-case (`my-function`, not `MyFunction`)
- [ ] DependsOn edges are accurate (matches actual call graph)
- [ ] No circular dependencies
- [ ] Tests cover happy path, edge cases, and errors
- [ ] Reference implementation builds and all tests pass
- [ ] Extraction tool correctly resolves the graph
