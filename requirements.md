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

### Node Graph

A library is a **directed acyclic graph of nodes**. Each node represents a discrete unit of functionality: a function, a data type, or a small cohesive module.

Each node has:

- **Identity.** A unique, stable identifier.
- **Reference implementation.** Working code in the donor language.
- **Tests.** Executable tests that define the behavioral contract for this node.
- **Dependencies.** Directed edges to other nodes this one requires.
- **Metadata.** Description, version, performance annotations, translation hints.

A node is either **pure** (no dependencies — a leaf in the graph) or **composite** (depends on other nodes).

### Selective Extraction

When a consumer requests a node, they receive its **transitive closure** — that node plus every node reachable through its dependency edges. Nothing else.

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

1. Read the reference implementation and tests for each node.
2. Translate to the target language, preserving behavioral contracts.
3. Run the translated tests to verify correctness.
4. Where nodes connect through interfaces, generate appropriate abstractions in the target language (traits, interfaces, protocols, etc.).

The dependency edges tell the agent where the architectural boundaries are. The tests tell it whether the translation is correct.

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
- **Incremental adoption.** Can existing well-tested libraries be converted into this form without a ground-up rewrite?
- **Human reviewability.** Can a developer audit the reference to understand what they're asking an agent to build?

### Boundary Conditions

The approach has known limits. These should be acknowledged, not hand-waved:

- **Performance-critical code.** Libraries whose value is implementation-level optimization (BLAS, FFmpeg, zlib) cannot be fully captured by a behavioral spec. The *how* is the value. For these, the reference can include performance annotations or directives that tell the agent to bind to platform-native optimized implementations rather than generating naive code.
- **Hardware-specific code.** Drivers, SIMD intrinsics, GPU kernels — platform abstraction is the wrong goal here.
- **Security-sensitive implementations.** Where correctness depends on implementation details (constant-time execution, memory zeroing, side-channel resistance), behavioral tests are insufficient.

The sweet spot is **logic-heavy, platform-independent code**: business rules, protocols, algorithms, data structures, transformations, and the vast majority of application-level code.

## Open Questions

- **Single donor language or domain-dependent?** Is one language the universal donor, or should numerical libraries use Julia/C#, web/API specs use Kotlin/TypeScript, etc.?
- **Graph format.** The node graph structure needs a concrete representation. What's the minimal format for declaring nodes, edges, and metadata? (The node *contents* are just code and tests in the donor language — only the graph structure needs a format.)
- **Interface nodes.** How are abstraction boundaries represented? When a node depends on "a gradient function" as an interface rather than a concrete implementation, how is that expressed?
- **Performance annotations.** What vocabulary is needed to tell an agent "don't be naive about this — use platform-optimized implementations where available"?
- **Versioning and evolution.** How do nodes version? When a node's contract changes, how does that propagate through the graph?
- **Empirical validation.** The "universal donor" hypothesis is testable. Take the same library, represent it multiple ways, measure agent translation quality. This should be done before committing to an approach.

## Status

Requirements and hypotheses captured. No solution prescribed. Next step is empirical exploration.
