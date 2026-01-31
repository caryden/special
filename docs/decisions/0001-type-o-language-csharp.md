# ADR-0001: C# as Initial Type-O Donor Language

**Date:** 2026-01-31
**Status:** Superseded by [ADR-0002](0002-type-o-language-typescript-bun.md)
**Deciders:** caryden

## Context

The project hypothesis requires choosing a "Type-O" donor language — a type-safe language targeting an abstract runtime that serves as the reference implementation from which AI agents translate to arbitrary target languages.

The donor language must support:
- Strong static types with generics (to communicate structure unambiguously)
- First-class annotation/attribute system (to declare the dependency graph as metadata)
- Runtime reflection (to enable mechanical extraction tooling)
- Mature test framework (tests are the behavioral contract)
- Compilation to an abstract runtime, not bare metal (to express logic without platform specifics)
- Deep representation in LLM training data (for agent translation quality)

The two strongest candidates are **C#** (.NET/CLR) and **Kotlin** (JVM).

## Decision

Use **C#** as the Type-O donor language for the initial experiment.

This is not a permanent commitment. It's a choice for the first test of the hypothesis, motivated by the likely first use case (numerical optimization, informed by the Optim.jl porting experience).

## Comparison

### Where they're equivalent

- Both have strong static type systems with generics.
- Both compile to abstract runtimes (CLR / JVM).
- Both have first-class annotation/attribute systems.
- Both have runtime reflection sufficient for the extraction tool.
- Both have mature test frameworks (xUnit/NUnit vs. JUnit/Kotest).
- Both are well-represented in LLM training data.

### C# advantages

- **Numeric generics.** C# has `INumber<T>`, `IFloatingPoint<T>`, and operator overloading with generic constraints. Writing `where T : IFloatingPoint<T>` and having `+`, `-`, `*` work on generic numeric types is exactly what numerical reference libraries need. Kotlin's numeric generics are weaker — no operator constraints on type parameters without workarounds.
- **Richer attributes.** C# attributes support arrays, type references (`typeof(...)`), and named parameters natively. `[Node("foo", DependsOn = new[] { "bar", "baz" })]` is clean and expressive. Kotlin annotations have restrictions: no null values, limited types in annotation parameters.
- **More direct reflection.** C# reflection loads assemblies and walks types, methods, and attributes in a single coherent API. Kotlin reflection works but leans on `java.lang.reflect` plus the `kotlin-reflect` library, adding a dependency and some friction.
- **Single-file programs.** C# supports top-level statements — a `.cs` file can be a complete, runnable program with no class boilerplate. Useful for small, self-contained node reference implementations.

### Kotlin advantages

- **Less ceremony.** Data classes, extension functions, null safety baked in. Fewer tokens per unit of meaning — less boilerplate for the same semantics.
- **Cleaner async.** Kotlin's structured concurrency (coroutines) is more straightforward than C#'s async/await + Task model, if any reference code involves async patterns.
- **Multiplatform targeting.** Kotlin compiles to JVM, JS, and native. Not directly relevant to the Type-O use case, but the language was designed with cross-target thinking.
- **JVM ecosystem.** Access to the entire Java library ecosystem if reference implementations need it.

### Why C# wins for the first experiment

The validated use case is numerical optimization (Optim.jl port). The likely first test case is math-heavy. C#'s numeric generic interfaces and operator overloading are a material advantage for expressing clean, generic numerical reference code. Kotlin would require workarounds (extension functions, wrapper classes) to achieve the same thing.

Additionally, C# attributes are the more capable annotation system, and annotations are the backbone of the entire graph declaration and extraction model.

## Consequences

- The first reference library prototype will be a C# project (.NET 8+).
- The extraction tool will use C# reflection (`System.Reflection`) to walk attributes.
- Tests will use xUnit or NUnit.
- Custom attributes (`[Node]`, `[Contract]`, `[TranslationHint]`) will be defined in C#.
- If the experiment succeeds, Kotlin should be evaluated as a donor for non-numerical domains where its lower ceremony and coroutine model may be advantages.
- If C#'s numeric generics turn out not to matter (e.g., the first test case doesn't exercise them), this decision should be revisited.

## References

- [.NET Generic Math](https://learn.microsoft.com/en-us/dotnet/standard/generics/math) — `INumber<T>`, `IFloatingPoint<T>`
- [C# Attributes](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/reflection-and-attributes/)
- [Kotlin Annotations](https://kotlinlang.org/docs/annotations.html)
- [requirements.md](../../requirements.md) — project requirements and evaluation rubric
