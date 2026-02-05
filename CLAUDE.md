# Special: A Claude Code Plugin for Modular Code Generation

## What this is

A Claude Code plugin marketplace hosting **special skills** — self-contained code
generation recipes backed by verified TypeScript reference implementations. Each skill
translates a tested reference into native code in any target language, generating only
the subset of nodes you need with zero external dependencies.

For the project thesis, see `docs/thesis.md`. For how skills work, see `docs/how-it-works.md`.

## Plugin architecture

This repository is a **Claude Code plugin** (manifest at `.claude-plugin/plugin.json`).
Skills within the plugin are designed to be **fully self-contained** — they must operate
without any help from this project's CLAUDE.md. When installed via a plugin marketplace,
users get only the skill directories; they do not get the host project's CLAUDE.md,
research/.

**Implications for skill authors:**
- All conventions, structured comment format docs, and process instructions must live
  inside each skill's own SKILL.md (or in the `create-special-skill` meta-skill)
- The canonical reference for creating skills is `skills/create-special-skill/SKILL.md`
- This CLAUDE.md is for contributors working on the repository itself, not for plugin consumers

## Repository structure

Skills live in `skills/<name>/` with a standard structure: `SKILL.md`, `HELP.md`,
`reference/` (TypeScript implementation), and `nodes/` (per-node specs). Meta-skills
(`create-special-skill`, `propose-special-skill`) help authors create new skills.
Research artifacts live in `research/`.

## Canonical skill format

Each skill uses **progressive disclosure** — four layers read in order:

1. **SKILL.md** — Overview: node graph, subset extraction, design decisions, YAML frontmatter
2. **nodes/\<name\>/spec.md** — Per-node behavioral spec with test vectors and `@provenance`
3. **nodes/to-\<lang\>.md** and **nodes/\<name\>/to-\<lang\>.md** — Optional translation hints (skill-level and node-level)
4. **reference/src/\<name\>.ts** — TypeScript source (consulted only if spec is ambiguous)

Skills accept arguments: `<nodes> [--lang <language>]` (default language: TypeScript).

## Key commands

```bash
# Run tests for a skill's reference (must be 100% coverage)
cd skills/<skill-name>/reference && bun test --coverage

# Run a specific test file
bun test skills/<skill-name>/reference/src/<node>.test.ts

# Run Python translation tests
cd research/experiments/<lib>-skill-python && python -m pytest -v

# Run Rust translation tests
cd research/experiments/<lib>-skill-rust && cargo test

# Run Go translation tests
cd research/experiments/<lib>-skill-go && go test -v ./...
```

## Conventions

- Skill names use whole-word kebab-case nouns: `optimization`, `math-expression-parser`, `when-words`
- Node IDs use kebab-case: `nelder-mead`, `parse-duration`, `token-types`
- One test file per node, linked via `@contract`
- **100% line and function coverage required — no exceptions.** Tests are the behavioral
  contract; uncovered code is unverifiable after translation.
- Reference implementations prioritize clarity over performance
- No metaprogramming or dynamic dispatch in reference code
- All functions are pure where possible; state and I/O are explicit
- Test vectors include `@provenance` annotations documenting source and validation
- Cross-library validation against established implementations where applicable

## Structured comment format

See `skills/create-special-skill/SKILL.md` § "Structured comment format" for the
canonical reference on `@node`, `@depends-on`, `@contract`, `@hint`, and `@provenance`.

## Git workflow

- Never use `gh pr merge --admin` to bypass branch protection
- Use `--auto` to queue merge after CI passes
- Wait for CI checks before merging PRs, even for "trivial" documentation changes
- Commit messages should be concise and describe the change (not the files touched)

## Code review

See `docs/code-review-checklist.md` for detailed criteria checked during CI review.
