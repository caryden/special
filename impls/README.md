# Implementations

This directory contains generated implementations from Spec IL specifications.

## Structure

```
impls/
├── rust/           # Rust implementations
│   ├── Cargo.toml
│   └── src/
├── c/              # C implementations  
│   ├── Makefile
│   ├── include/
│   └── src/
└── python/         # Python implementations
    ├── setup.py
    └── spec_il/
```

## Generating Implementations

Ask Claude to generate an implementation:

```
Generate a Python implementation of specs/crypto/hotp_totp.sil
```

Or use the (future) CLI:

```bash
./tools/generate.py specs/crypto/hotp_totp.sil --lang python --out impls/python/
```

## Requirements

### Python
- Python 3.10+
- pytest, hypothesis (for testing)

### Rust
- Rust 1.70+
- proptest (for property testing)

### C
- GCC or Clang
- Check (for unit testing)

## Conventions

All implementations must:

1. Include traceability comments linking to spec nodes
2. Pass all witness test cases
3. Follow language idioms (see skill docs)
4. Not add behavior beyond the spec
