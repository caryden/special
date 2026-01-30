# Spec IL Project Tasks

## Phase 0: Bootstrap Language
**Goal**: Working Spec IL parser and validator

### Tasks
- [ ] **0.1** Implement S-expression tokenizer
- [ ] **0.2** Implement Spec IL parser (grammar → AST)
- [ ] **0.3** Implement type checker (well-formed types)
- [ ] **0.4** Implement reference resolver (deps exist)
- [ ] **0.5** Implement consistency checker (no contradictions)
- [ ] **0.6** Implement witness validator (examples satisfy invariants)
- [ ] **0.7** Test parser on `specs/crypto/hotp_totp.sil`

### Deliverables
- `tools/parser.py` - Spec IL parser
- `tools/validate.py` - Validation tool
- Tests passing on HOTP spec

---

## Phase 1: First Spec Complete
**Goal**: HOTP/TOTP fully specified and validated

### Tasks
- [x] **1.1** Write SHA1 spec node
- [x] **1.2** Write HMAC-SHA1 spec node
- [x] **1.3** Write HOTP nodes (truncate, generate)
- [x] **1.4** Write TOTP nodes (timestep, generate)
- [x] **1.5** Add RFC test vectors as witnesses
- [ ] **1.6** Validate spec internal consistency
- [ ] **1.7** Document any spec ambiguities

### Deliverables
- `specs/crypto/hotp_totp.sil` - Complete spec ✓
- Validation report

---

## Phase 2: First Implementations
**Goal**: Working HOTP in three languages

### Tasks
- [ ] **2.1** Generate Python implementation
- [ ] **2.2** Generate Rust implementation  
- [ ] **2.3** Generate C implementation
- [ ] **2.4** All witness tests pass in all languages
- [ ] **2.5** Traceability comments present

### Deliverables
- `impls/python/hotp.py`
- `impls/rust/src/hotp.rs`
- `impls/c/src/hotp.c`

---

## Phase 3: Verification Pipeline
**Goal**: Automated testing from spec

### Tasks
- [ ] **3.1** Build witness test generator
- [ ] **3.2** Build property test generator
- [ ] **3.3** Generate test suites for each language
- [ ] **3.4** Run tests, all pass
- [ ] **3.5** Generate coverage report

### Deliverables
- `tools/gen_tests.py`
- `verify/tests/python/test_hotp.py`
- `verify/tests/rust/src/hotp_test.rs`
- Coverage report

---

## Phase 4: Cross-Validation
**Goal**: Prove implementations are congruent

### Tasks
- [ ] **4.1** Build input generator for HOTP types
- [ ] **4.2** Build cross-language harness
- [ ] **4.3** Build output comparator
- [ ] **4.4** Run 1M random inputs
- [ ] **4.5** Analyze any disagreements
- [ ] **4.6** Generate congruence certificate

### Deliverables
- `tools/crossval.py`
- Congruence report (target: 100% agreement)

---

## Phase 5: Formal Proofs
**Goal**: Mathematical guarantees for key properties

### Tasks
- [ ] **5.1** Extract proof obligations from HOTP spec
- [ ] **5.2** Translate to SMT-LIB format
- [ ] **5.3** Run Z3 on bounded verification
- [ ] **5.4** Attempt full proofs
- [ ] **5.5** Document unprovable cases
- [ ] **5.6** Generate proof certificates

### Deliverables
- `verify/proofs/crypto/hotp/`
- Proof certificates for provable invariants

---

## Phase 6: Registry Prototype  
**Goal**: Shareable verified spec nodes

### Tasks
- [ ] **6.1** Design registry schema
- [ ] **6.2** Implement content-addressed storage
- [ ] **6.3** Implement dependency resolver
- [ ] **6.4** Build CLI for pull/push
- [ ] **6.5** Publish HOTP spec nodes

### Deliverables
- `tools/registry.py`
- Published HOTP nodes with proofs

---

## Stretch Goals

- [ ] Multi-agent generation (Claude + Gemini + local model)
- [ ] Add AES-GCM spec
- [ ] Add JWT validation spec
- [ ] Add URL parsing spec (curl-core subset)
- [ ] Integration with CI/CD
- [ ] Web UI for spec browsing

---

## Progress Log

| Date | Phase | Task | Status | Notes |
|------|-------|------|--------|-------|
| 2026-01-29 | 0 | Project setup | ✓ | CLAUDE.md, skills, initial spec |
| 2026-01-29 | 1 | HOTP spec | ✓ | All RFC test vectors included |
| | | | | |
