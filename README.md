# Spec IL: Specification Intermediate Language

**A dense, formal specification language for AI-generated, verified software.**

## The Problem

Software libraries today are distributed as code. This creates:
- **Supply chain attacks**: Malicious code hides in dependencies
- **Platform lock-in**: Code targets specific languages/architectures
- **Trust by faith**: We trust maintainers, not proofs
- **Verification cost**: Formal methods are prohibitively expensive

## The Solution

Distribute *specifications*, not code.

```
Spec IL (formal, auditable, non-executable)
         ↓
    AI Agent generates implementation
         ↓
    Your code, your control, verified
```

## How It Works

### 1. Spec IL Specifications

Formal, machine-readable specifications using S-expression syntax:

```lisp
(node hotp_truncate
  (sig (bytes) -> nat)
  (inv
    ; Output is exactly 6 digits (< 1,000,000)
    (< out 1000000)
    ; Deterministic
    (forall (x) (= (hotp_truncate x) (hotp_truncate x))))
  (witness
    (#x1f8698690e02ca16618550ef7f19da8e945b555a 872921)))
```

### 2. AI-Generated Implementations

Agents generate conforming implementations in any language:

```rust
// Generated from: hotp_truncate @ a3f7b2...
fn hotp_truncate(hmac: &[u8]) -> u32 {
    let offset = (hmac[19] & 0x0f) as usize;
    let code = ((hmac[offset] & 0x7f) as u32) << 24
             | (hmac[offset + 1] as u32) << 16
             | (hmac[offset + 2] as u32) << 8
             | (hmac[offset + 3] as u32);
    code % 1_000_000
}
```

### 3. Verification Pyramid

```
Level 0: Syntactic validity     ✓ Spec parses
Level 1: Internal consistency   ✓ Invariants don't contradict
Level 2: Witness conformance    ✓ Examples pass
Level 3: Property tests         ✓ Random inputs satisfy invariants
Level 4: Cross-validation       ✓ Multiple impls agree
Level 5: Formal proofs          ✓ Mathematical guarantee
```

### 4. Granular Trust

Each spec node carries its own verification level:

```
hotp_truncate @ a3f7b2   [L5: proven]
hmac_sha1 @ c4d8e1       [L4: bounded-verified]
sha1_compress @ 7f2a3b   [L5: proven]
```

Compose systems from verified building blocks.

## Project Status

**Phase: Bootstrap**

- [ ] Spec IL grammar definition
- [ ] Core spec library (types, primitives)
- [ ] HOTP/TOTP specs from RFC 4226/6238
- [ ] Code generators (Rust, C, Python)
- [ ] Property test generator
- [ ] Cross-validation harness
- [ ] SMT proof integration

## Quick Start

```bash
# Clone the repo
git clone <repo-url>
cd spec-il

# Point Claude Code at it
claude

# Ask Claude to:
# "Read the specs for HOTP and generate a Rust implementation"
# "Validate the TOTP spec for internal consistency"
# "Cross-validate the Python and Rust implementations"
```

## Why S-Expressions?

| Property | S-expr | JSON | YAML | Custom DSL |
|----------|--------|------|------|------------|
| Token density | High | Low | Medium | High |
| Parse complexity | Trivial | Medium | High | High |
| Homoiconic | Yes | No | No | Maybe |
| Extensible | Yes | Limited | Limited | Limited |

The spec can describe itself. Tools can manipulate specs as data.

## Security Implications

**What can't happen with Spec IL:**

- Malicious code in specs (specs don't execute)
- Supply chain injection (you generate your own code)
- Dependency confusion (no transitive code dependencies)
- Backdoors in updates (specs are auditable, content-addressed)

**Multi-agent verification:**

Different AI models, different training data, different failure modes.
If Claude, Gemini, and a local model all generate implementations that agree on 10 million test cases, the probability of correlated bugs approaches zero.

## License

MIT

## Contributing

This project is in early bootstrap phase. Contributions welcome:
- Spec IL grammar refinements
- Additional spec examples
- Code generator backends
- Verification tooling
- Formal proof integration
