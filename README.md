# Special

A Claude Code plugin marketplace for **special skills** — modular code generation from verified TypeScript references.

## The Idea

Today's libraries ship monolithic bundles of code. You need one function, you get the whole package — plus its transitive dependencies. This creates supply chain risk, dependency hell, and platform lock-in.

AI agents can now generate correct code from reference material. What if instead of shipping code, a library shipped a **modular, tested reference implementation** that an agent translates into exactly the subset you need, in your language, with zero external dependencies?

Each special skill is a self-contained generation recipe: a tested TypeScript reference implementation + layered specs + translation hints. An agent reads the skill, generates native code in your target language, and runs the tests to verify correctness.

## Skills

| Skill | Domain | Nodes | Tests | Coverage |
|-------|--------|-------|-------|----------|
| [optimization](skills/optimization/) | Numerical optimization (Nelder-Mead, BFGS, L-BFGS, gradient descent) | 10 | 191 | 100% |
| [math-expression-parser](skills/math-expression-parser/) | Math expression tokenizer, parser, evaluator | 6 | 96 | 100% |
| [when-words](skills/when-words/) | Human-friendly date/time formatting | 5 | 124 | 100% |

### Meta-Skills

| Skill | Purpose |
|-------|---------|
| [create-special-skill](skills/create-special-skill/) | Create a new special skill from a spec, RFC, or existing library |
| [propose-special-skill](skills/propose-special-skill/) | Package and propose a skill for inclusion via GitHub issue |

## How It Works

Each skill uses **progressive disclosure** — four layers the translation agent reads in order:

1. **SKILL.md** — Overview: node graph, subset extraction, design decisions
2. **nodes/\<name\>/spec.md** — Per-node behavioral spec with test vectors and `@provenance`
3. **nodes/\<name\>/to-\<lang\>.md** — Language-specific translation hints
4. **reference/src/\<name\>.ts** — TypeScript source (consulted only if spec is ambiguous)

The agent generates only the nodes you request, in dependency order, running tests after each node.

## Usage

Each skill accepts nodes to generate and an optional target language:

```
/optimization nelder-mead --lang python
/math-expression-parser all --lang rust
/when-words time-ago duration --lang go
```

Default target language is TypeScript if not specified.

## Key Findings

1. **The skill format is canonical.** Progressive disclosure (spec → hints → reference) outperforms any single format. All layers are needed — confirmed empirically.

2. **De-bundling works.** A subset (3 of 10 optimization nodes) can be extracted and translated independently. The node graph cleanly delineates subset boundaries.

3. **Translation generates improvement signals.** When agents hit spec ambiguities, they consult the reference to resolve them. These ambiguities are actionable feedback — filed as issues or PRs.

4. **Cross-library validation builds trust.** Test vectors with `@provenance` annotations, verified against scipy v1.17.0 and Optim.jl v2.0.0, give consumers confidence in the reference.

## Experiment Results

| Experiment | Format | Languages | Result |
|-----------|--------|-----------|--------|
| whenwords 3×3 | REF, SPEC, PROMPT × Python, Rust, Go | 9 runs | REF best first-pass accuracy; PROMPT diverged |
| mathexpr 3×3 | REF, SPEC, PROMPT × Python, Rust, Go | 9 runs | All pass; SKILL format designed from findings |
| mathexpr skill | SKILL × Python, Rust, Go | 3 runs | All pass |
| **optimize NM subset** | **SKILL × Python, Rust, Go** | **3 runs** | **108/108 tests pass, de-bundling confirmed** |

See [requirements.md](requirements.md) for the full hypothesis and evaluation rubric.
See [docs/research-note-skill-architecture.md](docs/research-note-skill-architecture.md) for the skill format design rationale.

## Origin

Predicted and then validated by [Drew Breunig's "A Software Library With No Code"](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Jan 2026). Further informed by practical experience porting a subset of Optim.jl to TypeScript using AI agent translation with test-driven verification.
