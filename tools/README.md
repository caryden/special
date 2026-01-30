# Tools

This directory contains tooling for working with Spec IL.

## Planned Tools

### parser.py
Parse Spec IL files into AST.

```bash
./tools/parser.py specs/crypto/hotp_totp.sil --output ast.json
```

### validate.py  
Validate Spec IL files for syntax, consistency, and completeness.

```bash
./tools/validate.py specs/crypto/hotp_totp.sil
```

### generate.py
Generate implementations from specs.

```bash
./tools/generate.py specs/crypto/hotp_totp.sil --lang rust --out impls/rust/
```

### gen_tests.py
Generate test suites from specs.

```bash
./tools/gen_tests.py specs/crypto/hotp_totp.sil --lang python --out verify/tests/python/
```

### verify.py
Run verification tests against implementations.

```bash
./tools/verify.py impls/python/hotp.py --spec specs/crypto/hotp_totp.sil
```

### crossval.py
Cross-validate multiple implementations.

```bash
./tools/crossval.py specs/crypto/hotp_totp.sil \
    --impls impls/rust impls/python impls/c \
    --iterations 1000000
```

### to_smt.py
Generate SMT-LIB queries from specs for formal verification.

```bash
./tools/to_smt.py specs/crypto/hotp_totp.sil --node hotp_generate > hotp.smt2
z3 hotp.smt2
```

### registry.py
Interact with spec registry (future).

```bash
./tools/registry.py push specs/crypto/hotp_totp.sil
./tools/registry.py pull hotp_generate@a3f7b2 --lang rust
```

## Implementation Status

| Tool | Status | Notes |
|------|--------|-------|
| parser.py | Not started | Phase 0 |
| validate.py | Not started | Phase 0 |
| generate.py | Not needed | Claude does this |
| gen_tests.py | Not started | Phase 3 |
| verify.py | Not started | Phase 3 |
| crossval.py | Not started | Phase 4 |
| to_smt.py | Not started | Phase 5 |
| registry.py | Not started | Phase 6 |

## Note on Code Generation

The `generate.py` tool is actually optional - Claude Code can generate implementations directly from specs using the `spec-il-codegen` skill. The tool would be for non-interactive/CI use.
