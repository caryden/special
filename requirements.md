# Requirements: Modular Verified References for AI-Native Code Generation

## Motivation

### The Bundling Problem

Software libraries are distributed as monolithic bundles. When you need one function, you get the entire library — plus its transitive dependencies. This is the default packaging model across every ecosystem: npm, PyPI, crates.io, NuGet, Maven.

Consequences:

- **Supply chain attack surface.** Every transitive dependency is an attack vector. A single compromised package deep in the graph can affect thousands of downstream projects. You audit the library you chose; you trust the 200 libraries it pulled in.
- **Dependency hell.** Version conflicts, diamond dependencies, breaking upgrades. The complexity grows combinatorially with the dependency graph.
- **Unused code.** Most projects use a fraction of the libraries they import. The rest is dead weight — dead weight that still gets compiled, shipped, and exposed to attackers.
- **Platform lock-in.** Libraries ship code in a specific language for a specific runtime. Cross-language use requires FFI, bindings, or rewrites.

### The Opportunity

AI coding agents (Claude Code, Copilot, etc.) can now generate correct implementations from reference material. This changes the economics of code distribution. Instead of shipping pre-built code, you can ship a *reference* that an agent translates into exactly what the consumer needs — in their language, for their platform, including only the functionality they asked for.

This was validated in practice: porting a subset of [Optim.jl](https://github.com/JuliaNLSolvers/Optim.jl) (Julia numerical optimization) to TypeScript by having an AI agent analyze the Julia source, port only the needed functionality, translate the unit tests, and then extract additional test conditions from Julia to verify mathematical equivalence. The result: a self-contained TypeScript library with zero external dependencies, verified against the reference, containing only the functions actually needed.

### Prior Art

- [A Software Library With No Code](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Drew Breunig, Jan 2026) — demonstrated the concept using markdown + YAML specs that an LLM consumes to generate implementations. Proved the idea works. Raised the question of whether markdown + YAML is the optimal format.

## Core Hypothesis

There exists an optimal *form* for reference material — a "universal donor" representation — that AI agents can most efficiently and reliably translate into correct implementations in any target language. This form is somewhere on a spectrum:

```
Natural language prose
  → Markdown + YAML
    → Structured DSL
      → Reference implementation in a well-chosen real language
        → Formal specification (Lean/Dafny/TLA+)
```

The hypothesis is that the sweet spot is toward the "reference implementation in a real language" end — specifically, a **type-safe language that compiles to an abstract runtime** (C#, Kotlin, Java, Swift, etc.) rather than a custom specification language or a natural language description.

Rationale:

- AI agents have deep training data for real languages; a novel DSL has zero.
- Real languages have real toolchains: the reference implementation *runs* and its tests *execute*.
- Type-safe, managed languages express logic and structure without leaking platform-specific details (memory management, calling conventions, hardware).
- The reference captures both behavioral intent and structural architecture — not just *what* the code does, but how it's organized.

## The Model

### The Graph Is Already in the Code

The dependency graph between functions, types, and modules is not a new data model to design — it already exists implicitly in any well-structured codebase. Functions call other functions. Types reference other types. Modules import other modules. The graph is *there*; it just isn't surfaced.

This was demonstrated in practice with the Optim.jl port: an AI agent analyzed the Julia source, traced the dependency graph from the requested functions, and extracted only the needed subgraph. It worked — but it required significant back-and-forth because the agent had to *discover* the graph by reading and reasoning about the code. Every agent that consumes the same library would repeat this same discovery work.

The key insight: **the graph should be pre-computed and declared, not discovered at translation time.** The work of understanding the dependency structure is the same for every consumer. It should be done once by the reference author and made explicit in the code.

### Metadata Annotations

Languages with attribute/annotation systems (C# attributes, Kotlin/Java annotations) allow the graph to be declared directly in the source code as metadata on the reference implementation:

```csharp
[Node("l-bfgs", DependsOn = new[] { "line-search", "convergence-check", "vec-ops" })]
[Contract(TestClass = typeof(LBFGSTests))]
[TranslationHint("Target should use platform BLAS for vec-ops if available")]
public static MinResult<T> LBFGS<T>(...) where T : IFloatingPoint<T> { ... }
```

```kotlin
@Node("l-bfgs", dependsOn = ["line-search", "convergence-check", "vec-ops"])
@Contract(testClass = LBFGSTests::class)
@TranslationHint("Target should use platform BLAS for vec-ops if available")
fun <T : Comparable<T>> lbfgs(...): MinResult<T> { ... }
```

The attributes pre-compute what every agent would otherwise need to figure out:

- **What depends on what.** Explicit `DependsOn` edges instead of agent inference from call sites.
- **Where the tests are.** Direct link between implementation and its behavioral contract.
- **Translation guidance.** Hints about platform-specific concerns, performance expectations, or adaptation strategies that would otherwise require the agent to reason about from scratch.

The code *is* the reference implementation. The annotations *are* the graph. Nothing is separated into a different format or language.

### Reflection-Based Extraction

Languages with strong reflection capabilities (C#, Kotlin/Java) allow the annotated graph to be walked mechanically at runtime. A tool — not an AI agent, just a simple program — can:

1. Load the reference assembly/JAR.
2. Walk every type and method decorated with `[Node]` attributes.
3. Build the complete dependency graph from the declared edges.
4. Given a requested node, compute its transitive closure.
5. Emit only the reference code and associated tests for that subgraph.

This is a mechanical pre-processing step, perhaps 100 lines of code. It does not require AI. It transforms the full annotated library into a minimal, self-contained package ready for agent consumption.

This splits the work cleanly:

| Step | Done by | Input | Output |
|------|---------|-------|--------|
| **Author** reference with annotations | Human developer | Domain knowledge | Annotated reference library |
| **Extract** requested subgraph | Reflection tool (mechanical) | Node ID + annotated library | Minimal code + tests package |
| **Translate** to target language | AI agent | Extracted package | Native implementation |
| **Verify** against translated tests | Agent + test runner | Generated code + tests | Pass/fail |

The agent never sees the full library. It receives a minimal, pre-extracted package with the graph already resolved, dependencies explicit, and tests attached. No discovery overhead.

### Node Structure

Each annotated node in the reference library represents a discrete unit of functionality: a function, a data type, or a small cohesive module.

Each node carries (via annotations and the code itself):

- **Identity.** A unique, stable identifier (the annotation name).
- **Reference implementation.** The actual method/class body — working, executable code in the donor language.
- **Tests.** Linked test class(es) that define the behavioral contract.
- **Dependencies.** Declared edges to other node identifiers.
- **Metadata.** Translation hints, performance annotations, descriptions — anything that pre-computes knowledge an agent would otherwise need to derive.

A node is either **pure** (no `DependsOn` — a leaf in the graph) or **composite** (depends on other nodes).

### Selective Extraction

When a consumer requests a node, the reflection tool computes its **transitive closure** — that node plus every node reachable through its dependency edges. Nothing else.

Example: requesting `l-bfgs` from an optimization library yields:

```
l-bfgs → line-search → backtracking-armijo
       → gradient (interface — consumer provides or selects an impl)
       → convergence-check
       → vec-ops (dot, norm, scale, axpy)
```

The consumer gets 6 nodes. Not the 40 other optimization algorithms, not the CLI tools, not the plotting utilities.

### Agent Translation

An AI agent receives the extracted subgraph and generates a native implementation in the consumer's target language:

1. Read the reference implementation and tests for each node in the subgraph.
2. Translate to the target language, preserving behavioral contracts.
3. Run the translated tests to verify correctness.
4. Where nodes connect through interfaces, generate appropriate abstractions in the target language (traits, interfaces, protocols, etc.).
5. Where translation hints indicate platform-specific concerns (e.g., async/await in a target without coroutines), consult agent skills or ask the user for adaptation decisions.

The pre-computed annotations mean the agent spends its context window on *translation*, not *discovery*.

## Evaluation Rubric

Any proposed approach — whether it's a specific donor language, a custom format, or a hybrid — should be evaluated against these properties:

### Agent Effectiveness

- **Translation accuracy.** Does the agent produce correct implementations on the first pass? Measured by test pass rate.
- **Semantic transparency.** Does every token in the representation map directly to behavioral meaning? (Metaprogramming, macros, and heavy abstraction layers reduce transparency — see: RxInfer.jl confusing agents.)
- **Context efficiency.** How many tokens of input does the agent need to produce a correct output? This affects speed, coherence within context window limits, and cost. Not just dollar cost — staying within context windows is the primary concern.
- **Training distribution alignment.** Does the representation match patterns the agent has seen extensively in training? Agents are better at some languages than others due to training data distribution and the inherent entropy of the language.

### Reference Quality

- **Modularity.** Can individual functions or small modules be extracted independently? The unit of extraction should be a function or cohesive module, not a package.
- **Test completeness.** Do the tests fully specify the behavioral contract? Including edge cases, error conditions, and (where relevant) performance bounds?
- **Executability.** Can the reference implementation and its tests be run directly? A spec that can't be validated against itself is less trustworthy than one that can.
- **Type expressiveness.** Does the type system capture the important structural constraints? Strong types communicate intent unambiguously across language boundaries.

### Practical Viability

- **Authoring cost.** Can developers realistically create and maintain reference implementations? Using a real language with existing tooling dramatically lowers this barrier vs. a custom spec language.
- **Toolchain maturity.** Does the approach leverage existing compilers, test runners, IDEs, and static analysis? Or does it require building a new toolchain from scratch?
- **Annotation and reflection support.** Does the language have a first-class attribute/annotation system for declaring graph metadata directly in the source? Does it have runtime reflection capable of walking those annotations mechanically? This is a prerequisite for the extraction tooling. (C# and Kotlin/Java are strong here; Python decorators are weaker; C and Go lack this entirely.)
- **Incremental adoption.** Can existing well-tested libraries be converted into this form without a ground-up rewrite? Ideally, annotating an existing well-structured codebase should be the primary onboarding path — not rewriting from scratch.
- **Human reviewability.** Can a developer audit the reference to understand what they're asking an agent to build?

### Boundary Conditions

The approach has known limits. These should be acknowledged, not hand-waved:

- **Performance-critical code.** Libraries whose value is implementation-level optimization (BLAS, FFmpeg, zlib) cannot be fully captured by a behavioral spec. The *how* is the value. For these, the reference can include performance annotations or directives that tell the agent to bind to platform-native optimized implementations rather than generating naive code.
- **Hardware-specific code.** Drivers, SIMD intrinsics, GPU kernels — platform abstraction is the wrong goal here.
- **Security-sensitive implementations.** Where correctness depends on implementation details (constant-time execution, memory zeroing, side-channel resistance), behavioral tests are insufficient.

The sweet spot is **logic-heavy, platform-independent code**: business rules, protocols, algorithms, data structures, transformations, and the vast majority of application-level code.

## Open Questions

- **Single donor language or domain-dependent?** Is one language the universal donor, or should numerical libraries use Julia/C#, web/API specs use Kotlin/TypeScript, etc.? The donor language must have strong annotation/attribute support and runtime reflection to enable the mechanical extraction tooling. C# and Kotlin/Java are strong candidates. Languages without annotation systems (C, Go, most functional languages) are weaker candidates regardless of other merits.
- **Annotation vocabulary.** What's the right set of annotations? `[Node]`, `[Contract]`, and `[TranslationHint]` are illustrative but not designed. What metadata actually matters? What do agents need to know that they can't infer from the code itself? This should be driven by empirical observation of where agents struggle during translation.
- **Interface nodes.** How are abstraction boundaries represented in annotations? When a node depends on "a gradient function" as an interface rather than a concrete implementation, how is that declared? The donor language's own interface/trait system may be sufficient, or it may need annotation support.
- **Performance annotations.** What vocabulary is needed to tell an agent "don't be naive about this — use platform-optimized implementations where available"? This bridges the boundary condition for performance-critical code.
- **Granularity.** What's the right size for a node? A single function? A class? A small module? Too fine-grained and the annotation overhead dominates; too coarse and you lose the unbundling benefit.
- **Extraction tool design.** The reflection-based tool that walks annotations and emits subgraphs is small but its output format matters. What does the agent actually receive? Raw source files? A structured package with manifest? How are cross-node type references handled in the extracted output?
- **Versioning and evolution.** How do nodes version? When a node's contract changes, how does that propagate through the graph?
- **Empirical validation.** The "universal donor" hypothesis is testable. Take the same library, represent it multiple ways, measure agent translation quality. This should be done before committing to an approach.

## Status

Requirements and hypotheses captured. No solution prescribed. Next step is empirical exploration.
