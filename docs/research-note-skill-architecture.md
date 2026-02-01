# Research Note: From Format Comparison to Skill Architecture

## Context

This note synthesizes findings from the whenwords and mathexpr experiments
(Stages 1–2) and reframes the Type-O hypothesis based on observed results.
It then proposes a refined skill architecture informed by prior work extracting
and converting Optim.jl (a Julia optimization library) to TypeScript using
claude-sonnet, and the subsequent one-shot conversion by GPT-Codex using a
prompt distilled from that guided process.

## What the Experiments Showed

### Format comparison results (18 opus + 9 haiku + 9 sonnet translations)

| Finding | Implication |
|---------|-------------|
| PROMPT diverges on off-policy decisions (whenwords: 6/116 failures) | Natural language alone can't communicate arbitrary design choices |
| SPEC matches REF correctness at 0.6x token cost | Test vectors are the critical disambiguation mechanism |
| REF preserves modular architecture; PROMPT doesn't | Reference code guides structure, not just correctness |
| On-policy tasks (mathexpr) show no format advantage | The model's training data already encodes textbook algorithms |
| Haiku needs 2–3x more iterations but same correctness | Smaller models have execution reliability issues, not knowledge gaps (for on-policy) |
| Sonnet PROMPT diverged on `-2 ** 2` precedence | Even "on-policy" tasks have off-policy micro-decisions |

### The on-policy / off-policy framing

- **On-policy**: desired behavior matches model priors (textbook algorithms,
  standard protocols). Any format works. Token efficiency is the only differentiator.
- **Off-policy**: desired behavior involves arbitrary decisions not in training data
  (thresholds, defaults, conventions). Test vectors or reference code are essential.

**Key realization**: on-policy vs off-policy primarily affects token efficiency, not
correctness — *when test vectors are available*. With SPEC or REF, even off-policy
tasks converge to correct behavior. The format question is really about cost
optimization, not about whether correctness is achievable.

## The Hybrid Insight

The experiment design was artificially pure: each agent received exactly ONE format
(PROMPT, SPEC, or REF). This either-or constraint was useful for isolating variables
but doesn't reflect how an agent would optimally work. The results show that the
formats aren't competing — they're complementary layers:

| Layer | Role | When used |
|-------|------|-----------|
| **PROMPT** | Leverage on-policy knowledge; let the model use its training data efficiently | Always (cheapest path) |
| **SPEC** | Disambiguate off-policy decisions via test vectors and precise specs | When behavior has arbitrary design choices |
| **REF** | Validate correctness, preserve architecture, calibrate performance | When structure matters or as verification oracle |

The proper design given our test results is a **hybrid**: prompt + spec + ref,
allowing the agent to take full advantage of its training data (on-policy-ness) while
falling back to the reference for disambiguation and validation.

This is **progressive disclosure** applied to AI code generation:
1. Start with the prompt (on-policy knowledge is free)
2. Consult per-node specs when disambiguation is needed
3. Fall back to reference for validation and optimization

## From Reference Library to Skill

If prompt + spec + reference are layers of a single unit, that unit is a **skill** —
a packaged, distributable capability that an AI agent can consume to produce correct,
minimal, dependency-free native code in any target language.

### Skill anatomy (refined)

```
my-skill/
  skill.md                     — Progressive disclosure root: what this skill does,
                                  node graph overview, when/how to use it
  nodes/
    <node-name>/
      spec.md                  — Precise behavior for this node: type contracts,
                                  test vectors, edge cases, error conditions
      to-python.md             — Python-specific translation guidance
      to-rust.md               — Rust-specific translation guidance
      to-go.md                 — Go-specific translation guidance
      to-<lang>.md             — Additional languages as needed
  reference/
    src/<node-name>.ts         — Annotated implementation (validation oracle)
    src/<node-name>.test.ts    — Behavioral contracts (100% coverage)
  benchmarks/                  — Performance targets (optional)
    bench.ts                   — Reference timings for calibration
```

### Key design decisions

**1. Per-node spec files enable parallel execution.**
Each `nodes/<name>/spec.md` is self-contained — an agent can build multiple nodes
in parallel using separate Task sub-agents, each receiving only the spec for its
node plus the skill-level context from `skill.md`.

**2. Hints extracted from code into markdown.**
The `@hint` annotations in the Type-O reference code (e.g.,
`@hint datetime: Use epoch-based arithmetic, not string parsing`) are moved into
the per-node spec files and per-language translation guides. This means the agent
doesn't need to parse TypeScript comments to get translation guidance — the
knowledge is in the markdown layer.

**3. Per-language translation guides (`to-{lang}.md`).**
These capture language-specific implementation knowledge:
- How to represent tagged unions (Rust enums, Go interfaces, Python dataclasses)
- Idiomatic error handling patterns
- Performance considerations (e.g., "use `&str` not `String` for tokenizer input")
- Known pitfalls (e.g., "Python's `**` binds tighter than unary minus — the spec
  defines the opposite; see test vector `'-2 ** 2' → 4`")

These guides are the distilled output of prior translation experience — exactly
like the prompt that one-shotted the Optim.jl conversion for GPT-Codex was
distilled from the guided sonnet session.

**4. Reference code is for validation, not primary consumption.**
The agent reads `skill.md` and the per-node specs first. The reference TypeScript
is available for:
- Resolving ambiguities the spec doesn't cover
- Architectural guidance (how nodes compose)
- Running the reference test suite as a cross-validation oracle
- Performance benchmarking (comparing translation speed to reference)

### How an agent uses a skill

**Full library translation:**
1. Read `skill.md` → understand scope, node graph, dependencies
2. For each node (potentially in parallel):
   a. Read `nodes/<name>/spec.md` → understand behavior, test vectors
   b. Read `nodes/<name>/to-<lang>.md` → language-specific guidance
   c. Generate implementation + tests
   d. Run tests → if failures, consult spec for disambiguation
   e. If still stuck: read `reference/src/<name>.ts` for implementation detail
3. Compose nodes, run integration tests
4. If performance matters: run benchmarks, compare to reference timings, iterate

**Subset extraction (unbundling):**
1. Read `skill.md` → identify the node(s) needed
2. Compute transitive closure of `@depends-on` graph
3. Translate only the required subgraph
4. Result: minimal, dependency-free native code for exactly the functionality needed

### The @depends-on graph enables unbundling

The node graph isn't just documentation — it's the mechanism for extracting subsets.
Need only `debounce` from a utility skill? Extract the `debounce` node and its
transitive `@depends-on` closure. The skill is a menu, not a monolith.

This directly addresses the supply chain bloat problem:
- **Current**: `npm install lodash` → 79 transitive deps, 39 maintainers to trust
- **Skill**: translate just the `debounce` subgraph → zero deps, auditable code

Research supports the severity of this problem:
- The DepPrune study found **50.6% of npm dependencies are bloated** (never accessed
  at runtime); removing them breaks zero tests
- Installing an average npm package means trusting **79 third-party packages and
  39 maintainers** (Zimmermann et al., USENIX 2019)
- The 2025 Shai-Hulud npm attacks compromised 18 packages with 2.6B weekly downloads;
  a second wave hit 700+ packages and 27K GitHub repos
- One package (`podcast-search`) had 681 dependencies; removing a single bloated
  direct dependency eliminated 680 of them (99.8% of the tree)

Tree-shaking and linkers mitigate binary size but not the trust problem — the code
exists in your dependency graph and runs during build regardless of whether you call
it at runtime.

## The Optim.jl Precedent

Prior work converting Optim.jl (Julia optimization library) to TypeScript established
that skill extraction from existing libraries is viable:

1. **Guided extraction with claude-sonnet**: ~1 hour with human guidance to extract
   a subset (Nelder-Mead, BFGS, etc.), create TypeScript reference, write tests,
   and validate against Julia outputs
2. **Benchmark-driven optimization**: Created benchmark tests timing optimization
   runs in Julia (compiled), then allowed the agent to iteratively optimize the
   TypeScript translation using correctness tests + Julia timing targets as benchmarks
3. **One-shot reproduction with GPT-Codex**: The prompt distilled from the guided
   sonnet session was sufficient for Codex to one-shot the entire extraction/conversion

This demonstrates:
- **Skills can be extracted from real libraries** (not just purpose-built references)
- **The distilled prompt IS the skill** — the guided process produces reusable knowledge
- **Performance calibration works** — the agent iterates toward reference timings
- **Cross-model transfer works** — knowledge distilled from sonnet guided Codex

## Open Skills vs Open Source

**Thesis: open skills will beat open source in an era dominated by AI coding agents.**

Open source distributes *code* — implementations in specific languages, with specific
dependency chains, specific API surfaces, specific performance characteristics. When
you `npm install lodash`, you get lodash's decisions baked in.

Open skills distribute *knowledge* — the understanding of what a function should do,
how to implement it correctly in any language, what the edge cases are, and how to
validate the result. The AI agent consumes the skill and produces native code:
zero dependencies, idiomatic to the target language, containing exactly the subset
of functionality needed.

| Dimension | Open Source | Open Skills |
|-----------|-----------|-------------|
| **Unit of distribution** | Code (language-specific) | Knowledge (language-agnostic) |
| **Dependencies** | Transitive trust chain | Zero (generated code is self-contained) |
| **Subset extraction** | Difficult (tree-shaking, partial imports) | Native (node graph + @depends-on) |
| **Language support** | One per package (or N maintained ports) | Any language, on demand |
| **Attack surface** | All code in dependency tree | Only the generated code (auditable) |
| **Maintenance** | Package authors update code | Skill authors update knowledge; regeneration picks up model improvements |
| **Versioning** | Semantic versioning of API surface | Versioning of behavioral contracts (test vectors) |

### The marketplace opportunity

Skills are self-contained, version-controlled directories. Distribution:
- **Plugin marketplace** — curated repository of verified skills
- **Quality-gated** — 100% test coverage, cross-validation results, benchmark data,
  per-language translation success rates
- **Community-built** — skill authors contribute knowledge, not code
- **Composable** — skills can depend on other skills via a skill graph

### Who creates skills? Agents do.

The entire skill lifecycle can be agent-driven:

1. **Extraction**: An agent reads an existing library's source + test suite,
   identifies the node graph, extracts specs and test vectors, writes the
   reference implementation. (The Optim.jl pattern, but automated.)
2. **Validation**: An agent translates the skill into N languages, runs
   cross-validation, reports per-language success rates. This IS the quality gate.
3. **Maintenance**: When the upstream library changes, an agent re-extracts,
   diffs the behavioral contracts, and updates the skill.
4. **Consumption**: An agent reads the skill and produces native code.

Humans curate and direct — choosing which libraries to extract, reviewing
skill quality, deciding what goes in the marketplace. But the work of
extraction, validation, and translation is automated.

This also means skills improve over time without human effort: as models
improve, re-running the validation pipeline produces better translations
with higher success rates. The knowledge (specs, test vectors) is stable;
the execution (translation quality) improves with each model generation.

## Revised Hypothesis

The original Type-O hypothesis: "Annotated reference implementations produce better
agent translations than less-structured source formats."

**Revised**: A **skill** (progressive disclosure of prompt + per-node specs +
per-language translation guides + reference code + benchmarks) is the optimal unit
for AI-native code generation. It leverages the model's on-policy knowledge first,
disambiguates off-policy decisions with test vectors, guides language-specific
implementation with translation hints, and validates against reference code and
performance targets.

The skill is to AI coding agents what source code is to compilers: the fundamental
unit of reusable knowledge. Open skills — curated, composable, language-agnostic —
may displace open source libraries as the primary mechanism for code reuse in an
AI-agent-dominated development workflow.

## What Makes a Good Skill Candidate?

Based on experiment results, skills provide the most value when:

- **High off-policy density** — many arbitrary design decisions that PROMPT alone
  would get wrong (thresholds, conventions, format codes, locale rules)
- **Natural node subgraph** — consumers typically need a subset, not the whole library
- **Cross-language demand** — the same functionality is needed in multiple languages
- **Supply chain risk** — the alternative is adding a dependency with a deep trust chain

Poor skill candidates:
- Textbook algorithms (on-policy — PROMPT alone works fine)
- Highly language-specific code (doesn't translate well)
- Libraries with no natural subset boundary (all-or-nothing)

### Candidate skill libraries (Stage 3)

| Candidate | Off-policy density | Unbundling potential | Supply chain value |
|-----------|-------------------|---------------------|-------------------|
| **date-fns subset** | High (locale rules, format tokens, edge cases) | High (200+ functions, most apps use 3–5) | High (common dep, deep tree) |
| **semver** | High (range parsing, pre-release ordering, `~` vs `^`) | Medium (8–10 nodes, natural graph) | Medium (every package manager needs it) |
| **Optim.jl subset** | Medium (algorithms on-policy, but defaults/interfaces off-policy) | High (want Nelder-Mead but not BFGS) | Low (Julia-specific) |
| **TOML parser** | High (escape sequences, multiline, type coercion) | Medium (parser is somewhat monolithic) | Medium (config files everywhere) |
| **lodash subset** | Low-Medium (utilities are mostly on-policy) | Very High (canonical bloat example) | Very High (most depended-on npm package) |

## Open Questions

1. **Does the hybrid skill approach actually reduce total tokens?** We tested each
   layer in isolation. The parallel-node execution with per-node specs may reduce
   total context per sub-agent while maintaining correctness.

2. **How much value do per-language guides add?** The `to-rust.md` files encode
   translation-specific knowledge (e.g., "use enums for tagged unions"). Is this
   cheaper than letting the agent figure it out from the spec alone?

3. **Can skill extraction be fully automated?** The Optim.jl experience required
   human guidance. Can an AI agent extract a skill from an existing library
   autonomously, given the source code + test suite?

4. **Does the node graph actually enable useful unbundling?** We haven't tested
   extracting a subgraph and translating just that subset. This is a critical
   experiment for the modularity thesis.

5. **What's the quality floor for the skill marketplace?** How do you verify that
   a community-contributed skill is correct, complete, and actually translatable?
   Cross-validation results and per-language success rates could serve as quality
   metrics.
