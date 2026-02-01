# Special

Exploring how AI coding agents change the economics of software library distribution.

## The Idea

Today's libraries ship monolithic bundles of code. You need one function, you get the whole package — plus its transitive dependencies. This creates supply chain risk, dependency hell, and platform lock-in.

AI agents can now generate correct code from reference material. What if instead of shipping code, a library shipped a **modular, tested reference implementation** that an agent translates into exactly the subset you need, in your language, with zero external dependencies?

Not "codeless libraries" exactly — **modular verified references that agents generate minimal, dependency-free native code from.**

## Current State

Three reference libraries built, cross-validated, and experimentally tested.

### Reference Libraries

| Library | Domain | Nodes | Tests | Coverage |
|---------|--------|-------|-------|----------|
| [whenwords](reference/whenwords/) | Relative time formatting | 5 | 124 | 100% |
| [mathexpr](reference/mathexpr/) | Math expression parser | 6 | ~100 | 100% |
| [optimize](reference/optimize/) | Numerical optimization | 10 | 191 | 100% |

The optimize library is cross-validated against scipy v1.17.0 (empirical) and Optim.jl v2.0.0 (from source). See [CROSS-VALIDATION.md](reference/optimize/CROSS-VALIDATION.md).

### Translation Experiments

**Formats tested**: REF (TypeScript source), SPEC (markdown), PROMPT (natural language), SKILL (progressive disclosure)

| Experiment | Format | Languages | Result |
|-----------|--------|-----------|--------|
| whenwords 3×3 | REF, SPEC, PROMPT × Python, Rust, Go | 9 runs | REF best first-pass accuracy; PROMPT diverged |
| mathexpr 3×3 | REF, SPEC, PROMPT × Python, Rust, Go | 9 runs | All pass; SKILL format designed from findings |
| mathexpr skill | SKILL × Python, Rust, Go | 3 runs | All pass |
| **optimize nelder-mead subset** | **SKILL × Python, Rust, Go** | **3 runs** | **108/108 tests pass, de-bundling confirmed** |

### Key Findings

1. **The skill format is the canonical approach.** Three layers of progressive disclosure (spec → translation hints → reference source) outperform any single format. All layers are needed — confirmed empirically.

2. **De-bundling works.** A subset (3 of 10 nodes) can be extracted and translated independently with no dependency leaks. The node graph cleanly delineates subset boundaries.

3. **Translation generates improvement signals.** When agents hit spec ambiguities, they consult the reference to resolve them. These ambiguities are actionable feedback for spec maintainers — filed as issues or PRs.

4. **Cross-library validation builds trust.** Test vectors with `@provenance` annotations, empirically verified against established libraries (scipy, Optim.jl), give consumers confidence in the reference.

See [requirements.md](requirements.md) for the full hypothesis and evaluation rubric.
See [docs/research-note-skill-architecture.md](docs/research-note-skill-architecture.md) for the skill format design rationale.

## Origin

Predicted and then validated by [Drew Breunig's "A Software Library With No Code"](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Jan 2026). Further informed by practical experience porting a subset of Optim.jl to TypeScript using AI agent translation with test-driven verification.
