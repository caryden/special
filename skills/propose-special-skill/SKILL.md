---
name: propose-special-skill
description: Package a completed special skill and propose it for inclusion in the special plugin via a GitHub issue
argument-hint: "<skill-name> — the kebab-case name of the skill to propose, e.g. 'date-formatter'"
allowed-tools: ["Bash", "Read", "Write", "Glob", "Grep"]
---

# Propose a Special Skill

Package an existing special skill directory into a zip archive and create a
GitHub issue proposing its inclusion in the special plugin.

## Input

`$ARGUMENTS` is the skill name (kebab-case), matching a directory under `skills/`.

## Prerequisites

- The skill must already exist at `skills/$ARGUMENTS/` with:
  - `SKILL.md` with valid frontmatter
  - `reference/` with TypeScript source and tests
  - `nodes/` with per-node spec.md and translation hints
  - All tests passing with 100% coverage

## Steps

### 1. Validate the skill

Run the quality checklist before packaging:

```bash
cd skills/$ARGUMENTS/reference && bun test --coverage
```

Verify:
- [ ] All tests pass
- [ ] 100% line and function coverage
- [ ] SKILL.md has valid YAML frontmatter (name, description, argument-hint, allowed-tools)
- [ ] Every node in the node table has a corresponding `nodes/<name>/spec.md`
- [ ] Every node has at least `to-python.md`, `to-rust.md`, `to-go.md`
- [ ] `@node`, `@contract`, `@depends-on` annotations are present and consistent

If validation fails, report the issues and stop. Do not package an incomplete skill.

### 2. Package the skill

Create a zip archive of the skill directory:

```bash
cd skills && zip -r /tmp/$ARGUMENTS-skill.zip $ARGUMENTS/
```

The archive includes everything: SKILL.md, reference/, nodes/.

### 3. Create the GitHub issue

Use `gh` to create an issue proposing the skill:

```bash
gh issue create \
  --title "Propose special skill: $ARGUMENTS" \
  --body "$(cat <<'ISSUE_EOF'
## Proposed Skill: $ARGUMENTS

### Description
[Read from SKILL.md description]

### Node Graph
[Copy from SKILL.md]

### Validation
- Tests: [pass count] / [total] passing
- Coverage: 100% line, 100% function
- Languages with translation hints: Python, Rust, Go

### Attachment
The skill archive is attached below. Download and extract to `skills/` to install.

To test locally:
```
unzip $ARGUMENTS-skill.zip -d skills/
cd skills/$ARGUMENTS/reference && bun test --coverage
```
ISSUE_EOF
)"
```

Attach the zip file to the issue. If `gh` doesn't support direct attachment,
note the local path and instruct the user to attach it manually.

### 4. Report

Print:
- The GitHub issue URL
- The zip file location
- Instructions for the reviewer to install and test the skill
