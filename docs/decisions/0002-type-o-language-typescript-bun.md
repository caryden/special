# ADR-0002: TypeScript + Bun as Type-O Language (Supersedes ADR-0001)

**Date:** 2026-01-31
**Status:** Accepted (supersedes ADR-0001)
**Deciders:** caryden

## Context

ADR-0001 chose C# for its numeric generic interfaces, rich attribute system, and
runtime reflection. Before implementing the first reference library (whenwords),
practical constraints surfaced that challenge that decision:

1. **Toolchain weight.** C# requires the .NET 8 SDK — a heavy install that limits
   where the experiment can run. The goal is to use Claude Code Web and lightweight
   environments (Codespaces, sandboxes) where a single-binary runtime is preferable.

2. **Reflection is solving the wrong problem.** We designed a reflection-based
   extraction tool that loads compiled assemblies and walks attributes at runtime.
   But the consumer of the extraction output is an AI agent — which reads source
   code directly. The agent doesn't need a compiled binary to understand the
   dependency graph. It needs to read the files.

3. **The first test case doesn't need numeric generics.** Whenwords is string/date
   manipulation. The C# advantages (IFloatingPoint\<T\>, operator overloads) are
   irrelevant for this experiment. Choosing a language for a hypothetical future
   use case over the actual current one is premature optimization.

## Decision

Use **TypeScript** as the Type-O donor language, with **Bun** as the runtime and
test runner. Replace C# attributes with **structured JSDoc-style comments** that
declare the dependency graph.

## Key Changes from ADR-0001

### Structured comments replace attributes

Instead of:
```csharp
[Node("time-ago", DependsOn = new[] { "format-helpers" })]
[Contract(typeof(TimeAgoTests))]
[TranslationHint("Pure function, no platform concerns")]
public static string TimeAgo(long timestamp, long reference) { ... }
```

Use:
```typescript
/**
 * @node time-ago
 * @depends-on format-helpers
 * @contract time-ago.test.ts
 * @hint pattern: Pure function — reference timestamp is always explicit
 */
export function timeAgo(timestamp: number, reference: number): string {
  // ...
}
```

The structured comments:
- Carry the same information as C# attributes
- Are readable by the agent directly from source (no compilation step)
- Are parseable by a trivial script if mechanical extraction is ever needed
- Survive in any editor, any tool, any environment

### Agent reads source directly instead of reflection-based extraction

The C# approach required: author → compile → reflection tool → translation plan → agent.

The TypeScript approach: author → agent reads source files directly.

If a mechanical extraction tool is needed later, it's a simple script that parses
JSDoc `@node` / `@depends-on` tags from `.ts` files — no compilation, no runtime
reflection, no assembly loading. But for now, the agent can just read the files.

### Bun replaces .NET test infrastructure

- `bun test` is built-in, zero config, fast
- No separate test framework dependency (no xUnit, no NUnit)
- Test files colocated with source: `time-ago.ts` + `time-ago.test.ts`

## Comparison

### What TypeScript gains over C#

| Factor | C# | TypeScript + Bun |
|--------|-----|-----------------|
| Toolchain install | .NET 8 SDK (~500MB) | Bun (~30MB single binary) |
| Time to first test | `dotnet new` + project refs + restore | `bun init` |
| Runs in Claude Code Web | No (.NET not available) | Yes |
| LLM training representation | High | Very high (arguably highest) |
| Syntax overhead per node | Moderate (class, namespace, using) | Low (export function) |
| Test runner | xUnit (separate package) | Built-in (`bun test`) |
| Graph metadata | Compiled attributes + reflection | Structured comments (readable as-is) |

### What TypeScript loses

| Factor | C# advantage | Mitigation |
|--------|-------------|------------|
| Numeric generics | `INumber<T>`, `IFloatingPoint<T>` | Not needed for whenwords; revisit if/when a numerical reference is attempted |
| Formal attribute system | Type-safe, compiler-checked | Structured comments are convention-based, not compiler-enforced; acceptable for an experiment |
| Runtime reflection | Assembly-level introspection | Agent reads source directly; simple script can parse comments if needed |
| Stronger type system | More expressive generics, constraints | TypeScript's type system is sufficient for most reference code; use strict mode |

### The honest assessment

C# is the better *language* for formal, type-heavy reference implementations. TypeScript
is the better *choice for actually running this experiment* given the constraints. The
experiment's value is in testing whether the Type-O concept works at all — not in
optimizing the donor language. If the concept proves out, the donor language can be
revisited with data.

## Consequences

- Remove C# projects (TypeO.Attributes, TypeO.Extract, TypeO.sln)
- Whenwords reference will be a TypeScript project with `bun test`
- Node graph declared via structured JSDoc comments (`@node`, `@depends-on`, `@contract`, `@hint`)
- No compilation step required — agent reads `.ts` source files directly
- Skills updated to reflect TypeScript + Bun workflow
- ADR-0001 status changed to "Superseded by ADR-0002"

## References

- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [ADR-0001](0001-type-o-language-csharp.md) — original C# decision (superseded)
- [requirements.md](../../requirements.md) — project requirements and evaluation rubric
