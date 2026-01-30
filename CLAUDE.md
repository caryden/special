# Spec IL Project

A formal specification intermediate language for AI-generated, verified code.

## Project Vision

Build an infrastructure where:
1. Specifications are written in a dense, precise intermediate language (Spec IL)
2. AI agents generate conforming implementations in any target language
3. Implementations are verified against spec invariants
4. Multiple implementations are cross-validated for congruence
5. Formal proofs provide mathematical guarantees

## Current Phase: Bootstrap

We are building the foundation. Priority order:
1. Define Spec IL grammar and semantics
2. Spec HOTP/TOTP (RFC 4226/6238) as first real example
3. Generate implementations in Rust, C, Python
4. Build verification pipeline
5. Cross-validate implementations

## Directory Structure

```
spec-il/
├── grammar/           # Spec IL language definition
│   ├── spec-il.ebnf   # Formal grammar
│   └── semantics.md   # Semantic rules
├── specs/             # Spec IL specifications
│   ├── core/          # Foundational specs (types, primitives)
│   ├── crypto/        # Cryptographic specs (sha1, hmac, hotp, totp)
│   └── examples/      # Example specs for learning
├── impls/             # Generated implementations
│   ├── rust/
│   ├── c/
│   └── python/
├── verify/            # Verification infrastructure
│   ├── tests/         # Generated test suites
│   └── proofs/        # Formal proof artifacts
└── tools/             # Supporting tools
    ├── parser/        # Spec IL parser
    ├── validator/     # Consistency checker
    └── harness/       # Cross-validation harness
```

## Spec IL Quick Reference

Spec IL uses S-expression syntax for density and parseability.

### Node Structure
```lisp
(node <name>
  (sig <signature>)
  (inv <invariants>)
  (deps [<dependencies>])
  (witness [<examples>]))
```

### Type Syntax
- Primitives: `bool`, `nat`, `int`, `bytes`, `str`
- Parameterized: `[T]` (list), `T?` (option), `(T U)` (tuple), `T|U` (union)
- Functions: `T -> U`
- Constrained: `T:Ord`, `T:Eq`

### Invariant Syntax
- Quantifiers: `(forall (x) ...)`, `(exists (x) ...)`
- Relations: `(= a b)`, `(< a b)`, `(in x set)`
- Logic: `(and ...)`, `(or ...)`, `(not ...)`, `(implies a b)`
- Arithmetic: `(+ a b)`, `(- a b)`, `(* a b)`, `(len x)`

### Example
```lisp
(node reverse
  (sig ([T]) -> [T])
  (inv
    (= (len out) (len in))
    (forall (i)
      (implies (and (>= i 0) (< i (len in)))
        (= (at out i) (at in (- (- (len in) 1) i))))))
  (witness
    ([] [])
    ([1 2 3] [3 2 1])
    (["a"] ["a"])))
```

## Working Conventions

### When Writing Specs
- One node per function/type
- All invariants must be satisfiable together (no contradictions)
- Include at least 3 witnesses per node
- Reference dependencies by node name
- Add comments with `; comment`

### When Generating Implementations
- Read the full spec before writing code
- Preserve node IDs in code comments for traceability
- Never add behavior not in the spec
- Flag any spec ambiguity rather than assuming
- Generate both the implementation and its test harness

### When Verifying
- Run all witness cases first (fast sanity check)
- Then run property tests derived from invariants
- Report coverage mapped back to spec nodes
- Any failure means either: bug in impl, or bug in spec

### When Cross-Validating
- Use identical inputs across all implementations
- Disagreement = bug somewhere (investigate, don't ignore)
- Agreement on N million inputs = high confidence of congruence

## Key Commands

```bash
# Validate spec IL syntax and consistency
./tools/validate.py specs/crypto/totp.sil

# Generate implementation
./tools/generate.py specs/crypto/totp.sil --lang rust --out impls/rust/

# Run verification tests
./tools/verify.py impls/rust/totp.rs --spec specs/crypto/totp.sil

# Cross-validate implementations
./tools/crossval.py specs/crypto/totp.sil --impls impls/rust impls/c impls/python
```

## Skills Available

This project includes Claude Code skills in `.claude/skills/`:

- **spec-il**: Core language operations, validation, syntax help
- **spec-il-extract**: Extract specs from RFCs or existing code
- **spec-il-codegen**: Generate implementations from specs
- **spec-il-verify**: Generate and run verification tests
- **spec-il-crossval**: Cross-implementation validation
- **spec-il-prove**: Formal verification with SMT solvers

Invoke directly with `/spec-il`, `/spec-il-codegen`, etc., or let Claude choose automatically based on task.

## Quality Standards

### Specs Must Be
- Syntactically valid (grammar check passes)
- Internally consistent (no contradictory invariants)
- Complete (all referenced nodes exist)
- Witnessed (examples satisfy invariants)

### Implementations Must Be
- Conforming (pass all witness cases)
- Property-tested (invariant-derived tests pass)
- Traceable (comments link to spec nodes)
- Minimal (no unspecified behavior)

### Proofs Must Be
- Machine-checkable (Z3/SMT verifiable)
- Complete (all obligations discharged)
- Documented (human-readable explanation attached)

## References

- RFC 4226: HOTP Algorithm
- RFC 6238: TOTP Algorithm
- RFC 2104: HMAC
- FIPS 180-4: SHA-1 Specification
