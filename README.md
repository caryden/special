# Special

## The Thesis

Open source libraries are bundles. They package five forms of knowledge together — specification, evaluation, translation, curation, and trust — because the cost of translation (turning a specification into working code) has historically been high enough to justify bundling. You do the translation once, ship the result, and everyone uses that artifact.

AI coding agents are collapsing translation cost. When an agent can turn a behavioral specification into correct, tested code in any language, the economics of the bundle change. The translation — the `.js`, `.rs`, `.py` file — becomes a cached projection from a richer upstream representation, regenerable on demand.

When translation is cheap, the bundle breaks. What remains valuable is the specification (what correct behavior means), the evaluation (how to verify it), the curation (which algorithms and defaults to choose), and the trust (where it was validated and against what). The translation itself becomes commodity output.

A **skill** packages exactly the valuable residual: behavioral specs with test vectors, a dependency graph for subset extraction, per-language translation hints, a verified reference, and provenance annotations. An AI agent reads the skill and produces native code — zero dependencies, only the subset needed, verified against the same tests that define the spec.

Read the full argument: [docs/thesis.md](docs/thesis.md)

## What This Project Is

A Claude Code plugin that demonstrates the thesis. Each skill is a self-contained code generation recipe backed by a verified TypeScript reference implementation. An agent translates the tested reference into native code in any target language, generating only the subset of nodes you need with zero external dependencies.

## Skills

| Skill | Domain | Nodes | Tests | Coverage |
|-------|--------|-------|-------|----------|
| [optimization](skills/optimization/) | Numerical optimization (Nelder-Mead, BFGS, L-BFGS, CG, Newton, SA, and more) | 21 | 539 | 100% |
| [math-expression-parser](skills/math-expression-parser/) | Math expression tokenizer, parser, evaluator | 6 | 96 | 100% |
| [when-words](skills/when-words/) | Human-friendly date/time formatting | 5 | 124 | 100% |

### Meta-Skills

| Skill | Purpose |
|-------|---------|
| [create-special-skill](skills/create-special-skill/) | Create a new special skill from a spec, RFC, or existing library |
| [propose-special-skill](skills/propose-special-skill/) | Package and propose a skill for inclusion via GitHub issue |

## How Skills Work

Each skill uses **progressive disclosure** — four layers the translation agent reads in order:

1. **SKILL.md** — Overview: node graph, subset extraction, design decisions
2. **nodes/\<name\>/spec.md** — Per-node behavioral spec with test vectors and `@provenance`
3. **nodes/\<name\>/to-\<lang\>.md** — Language-specific translation hints
4. **reference/src/\<name\>.ts** — TypeScript source (consulted only if spec is ambiguous)

The agent generates only the nodes you request, in dependency order, running tests after each node. For the full technical explanation, see [docs/how-it-works.md](docs/how-it-works.md).

## Evidence

The thesis was tested through staged experiments across formats, languages, and models:

| Experiment | Design | Result |
|-----------|--------|--------|
| whenwords 3×3 | REF, SPEC, PROMPT × Python, Rust, Go | REF/SPEC 100%; PROMPT diverged on off-policy decisions |
| mathexpr 3×3×3 | 3 formats × 3 languages × 3 models (27 runs) | On-policy/off-policy distinction identified |
| mathexpr skill | SKILL × Python, Rust, Go | Skill format validated — REF correctness at PROMPT cost |
| **optimize NM subset** | **SKILL × Python, Rust, Go** | **108/108 tests pass, de-bundling confirmed** |

Key findings reframed as evidence for the thesis:
- **De-bundling works.** Subset extraction (3 of 21 nodes) produces correct, self-contained translations with zero dependencies.
- **Translation generates improvement signals.** Spec ambiguities discovered during translation become structured feedback — each consumption improves the skill.
- **Cross-validation builds trust.** Test vectors verified against scipy v1.17.0 and Optim.jl v2.0.0, with `@provenance` annotations documenting source and validation date.

See [research/](research/) for the full hypothesis, evaluation methodology, and experiment results.

## Usage

Each skill accepts nodes to generate and an optional target language:

```
/optimization nelder-mead --lang python
/math-expression-parser all --lang rust
/when-words time-ago duration --lang go
```

Default target language is TypeScript if not specified.

## Origin

Predicted and then validated by [Drew Breunig's "A Software Library With No Code"](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Jan 2026). Further informed by practical experience porting a subset of [Optim.jl](https://github.com/JuliaNLSolvers/Optim.jl) to TypeScript using AI agent translation with test-driven verification.
