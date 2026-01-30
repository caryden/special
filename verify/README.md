# Verification

This directory contains verification infrastructure and artifacts.

## Structure

```
verify/
├── tests/              # Generated test suites
│   ├── python/
│   ├── rust/
│   └── c/
├── proofs/             # Formal proof artifacts
│   └── crypto/
│       └── hotp/
├── coverage/           # Coverage reports
└── crossval/           # Cross-validation results
```

## Test Types

### Witness Tests (L2)
Concrete examples from spec. Fast sanity check.

```python
def test_hotp_witness_0():
    """Witness: key=..., counter=0, digits=6 -> 755224"""
    assert hotp_generate(key, 0, 6) == 755224
```

### Property Tests (L3)
Randomized tests derived from invariants.

```python
@given(st.binary(), st.integers(0, 2**64), st.integers(1, 10))
def test_hotp_bounded(key, counter, digits):
    """Invariant: output < 10^digits"""
    result = hotp_generate(key, counter, digits)
    assert result < 10**digits
```

### Bounded Verification (L4)
Exhaustive checking for small domains.

### Formal Proofs (L5)
SMT solver proofs for mathematical guarantees.

## Running Tests

### Python
```bash
cd verify/tests/python
pytest test_hotp.py -v
pytest test_hotp.py -k property --hypothesis-seed=42
```

### Rust
```bash
cd verify/tests/rust
cargo test
cargo test -- --include-ignored  # for slow property tests
```

### Cross-Validation
```bash
./tools/crossval.py specs/crypto/hotp_totp.sil --impls impls/*
```

## Proof Artifacts

Proofs are stored with metadata:

```
verify/proofs/crypto/hotp/
├── truncate_bounded.smt2      # SMT query
├── truncate_bounded.result    # Z3 output (sat/unsat)
└── truncate_bounded.json      # Metadata
```

Metadata includes:
- Spec node and invariant
- Solver version
- Proof result
- Timestamp
- Query hash (for reproducibility)
