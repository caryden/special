# Getting Started with Spec IL

## Quick Start (5 minutes)

### 1. Understand a Spec

Look at the HOTP spec in `specs/crypto/hotp_totp.sil`:

```lisp
(node hotp_generate
  (sig (bytes nat nat) -> nat)
  ; Params: key, counter, digits
  (inv
    ; Output bounded by 10^digits
    (implies (and (> digits 0) (<= digits 10))
      (< out (pow 10 digits)))
    ; Non-negative
    (>= out 0))
  (deps [hmac_sha1 hotp_dynamic_truncate])
  (witness
    (#x3132333435363738393031323334353637383930 0 6 755224)
    ...))
```

This says:
- `hotp_generate` takes bytes (key), nat (counter), nat (digits)
- Returns a nat (the OTP)
- Output is always < 10^digits and >= 0
- It depends on `hmac_sha1` and `hotp_dynamic_truncate`
- The test vector shows: key "12345678901234567890", counter 0, 6 digits → 755224

### 2. Generate an Implementation

Ask Claude:

```
Read specs/crypto/hotp_totp.sil and generate a Python implementation 
of hotp_generate and its dependencies.
```

Claude will:
1. Read the spec (using `spec-il` skill)
2. Generate conforming code (using `spec-il-codegen` skill)
3. Include traceability comments
4. Add witness tests

### 3. Verify the Implementation

Ask Claude:

```
Verify the Python implementation against the HOTP spec.
Run all witness tests and generate property tests.
```

Claude will:
1. Run witness cases (fast sanity check)
2. Generate property tests from invariants
3. Report coverage

### 4. Cross-Validate (Optional)

Ask Claude:

```
Generate a Rust implementation of HOTP from the same spec,
then cross-validate it against the Python implementation.
```

## Project Tasks

### Phase 1: Bootstrap (Current)

- [x] Define Spec IL grammar
- [x] Write HOTP/TOTP spec
- [ ] Build Spec IL parser/validator
- [ ] Generate Python implementation
- [ ] Generate Rust implementation
- [ ] Run verification tests
- [ ] Cross-validate implementations

### Phase 2: Tooling

- [ ] Formal proof generation (Z3)
- [ ] CI/CD integration
- [ ] Spec registry prototype

### Phase 3: Expansion

- [ ] Add more crypto specs (AES, ChaCha20)
- [ ] Add encoding specs (Base64, URL parsing)
- [ ] Multi-agent generation experiment

## Asking Claude for Help

Claude has skills loaded for this project. Just ask naturally:

| Task | Example Prompt |
|------|----------------|
| Understand spec | "Explain the hotp_generate spec to me" |
| Validate spec | "Check if the TOTP spec is internally consistent" |
| Extract spec | "Extract a spec from RFC 7519 (JWT)" |
| Generate code | "Implement the HOTP spec in Rust" |
| Verify code | "Run property tests on my Python HOTP implementation" |
| Cross-validate | "Compare the Rust and Python implementations" |
| Prove property | "Prove that hotp_generate output is always < 1000000 for 6 digits" |

## Key Files

```
CLAUDE.md                          # Project context (Claude reads this)
README.md                          # Project overview
grammar/spec-il.ebnf.md           # Language grammar
specs/crypto/hotp_totp.sil        # HOTP/TOTP specification
.claude/skills/                    # Claude Code skills
  spec-il/                         # Core language operations
  spec-il-extract/                 # Extract specs from sources
  spec-il-codegen/                 # Generate implementations
  spec-il-verify/                  # Generate/run tests
  spec-il-crossval/                # Cross-implementation validation
  spec-il-prove/                   # Formal proofs
```

## Common Workflows

### "I want to add a new spec"

1. Find authoritative source (RFC, academic paper, existing implementation)
2. Ask Claude: "Extract a spec from [source] for [function]"
3. Review and refine the generated spec
4. Add witnesses from test vectors in the source
5. Validate: "Check this spec for internal consistency"

### "I want to implement a spec"

1. Ask Claude: "Implement specs/[path].sil in [language]"
2. Review generated code
3. Ask Claude: "Verify this implementation against the spec"
4. Fix any failures
5. Optionally cross-validate against another language

### "I want to prove a property"

1. Ask Claude: "What are the provable properties in [spec]?"
2. Ask Claude: "Generate Z3 proof for [invariant]"
3. Review proof result
4. If unprovable, ask for bounded verification or manual proof sketch

## Tips

- **Start small**: Implement one node at a time, bottom-up from dependencies
- **Trust the spec**: If code doesn't pass witnesses, the code is wrong (or spec is)
- **Read the skills**: `.claude/skills/*/SKILL.md` has detailed guidance
- **Iterate**: First make it work (L2), then make it robust (L3), then prove it (L5)
