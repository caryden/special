# Additional Skill Candidates

For the project thesis, see `hypothesis.md`. For how skills work, see `../docs/how-it-works.md`.
For existing skill architectures, see `skill-architecture.md`.

## Context

With three production skills (`optimization`, `math-expression-parser`, `when-words`) and
one in progress (`robotics`), we have enough data to characterize what makes a skill
succeed. This document identifies and prioritizes candidates for the next skills to build.

## What makes a great skill

Six criteria, derived from experiment results and the core thesis:

| # | Criterion | Why it matters |
|---|-----------|----------------|
| 1 | **High off-policy density** | Arbitrary conventions, threshold tables, coefficient values not in LLM training data. THE differentiator — textbook algorithms are bad candidates. |
| 2 | **Natural subgraph boundaries** | DAG of 5-30 nodes where consumers need subsets, not everything. |
| 3 | **Cross-language demand** | Needed in JS, Python, Rust, Go, etc. |
| 4 | **Pure functions, no I/O** | Side-effect-free, platform-independent logic. |
| 5 | **Not performance-critical** | Cannot replace BLAS/FFmpeg where native speed matters. |
| 6 | **Supply chain risk reduction** | Replaces heavy npm/pip/cargo dependencies with auditable generated code. |

Criterion 1 is decisive. A skill full of textbook algorithms (e.g., basic sorting) adds no
value over what an LLM generates from memory. The value is in *conventions the LLM will
hallucinate* — coefficients, edge-case semantics, format disambiguation.

## Existing skills (avoid overlap)

| Skill | Nodes | Domain |
|-------|-------|--------|
| `optimization` | 21 | Numerical optimization (Nelder-Mead, BFGS, L-BFGS, etc.) |
| `math-expression-parser` | 6 | Tokenize, parse, evaluate math expressions |
| `when-words` | 5 | Human-friendly date/time formatting |
| `robotics` | ~35 | Kinematics, state estimation, path planning, control (in progress) |

---

## Tier 1: Strong candidates

High off-policy density, natural decomposition, broad cross-language demand.

### `cron-expressions`

**Elevator pitch:** Cron expression parsing, matching, and next-occurrence calculation.

**Off-policy signals:**
- Sunday = 0 or 7? Vixie cron says both. Quartz says neither (1-7, Sun=1).
- Day-of-week ∩ day-of-month (Vixie) vs day-of-week ∪ day-of-month (POSIX) when both are set.
- `L` (last day), `#` (nth weekday), `W` (nearest weekday) — non-standard but ubiquitous.
- Leap year handling for "last day of February."
- `*/0` — error or infinite loop? Libraries disagree.
- Month names (`JAN`-`DEC`) and day names (`SUN`-`SAT`) case sensitivity.

**Cross-language demand:** Every backend language, every CI/CD system, every scheduler.

**Constraint:** UTC-only (same approach as `when-words`). Timezone is a separate concern.

**Cross-validation targets:**
- `cron-parser` v5.x (npm) — most popular JS implementation
- `croniter` v3.x (Python) — Python standard
- Quartz CronExpression (Java) — enterprise standard, intentionally different semantics
- `cron` crate v0.15 (Rust) — Rust ecosystem standard

**Estimated scope:** 8-12 nodes, ~150-200 tests.

### `color-space`

**Elevator pitch:** Color space conversions with exact coefficients and transfer functions.

**Off-policy signals:**
- sRGB linear threshold: 0.04045 (IEC 61966-2-1) vs 0.003130 (some implementations use the
  inflection point). LLMs routinely hallucinate a third value.
- Bradford chromatic adaptation matrix — 9 coefficients, all off-policy.
- Oklab M1 and M2 matrices — 18 coefficients total, published 2020, frequently wrong in
  LLM output.
- D65 reference white: `[0.95047, 1.0, 1.08883]` (2-degree) vs `[0.9504, 1.0, 1.0888]`
  (truncated). Precision matters.
- Gamut mapping: clamp vs project-to-boundary vs iterative binary search in Oklch chroma.
- HSL ↔ RGB: the `H` modulo behavior and `S=0` achromatic edge case.

**Cross-language demand:** Frontend (CSS color manipulation), games, design tools, image
processing, data visualization. One of the broadest audiences.

**Cross-validation targets:**
- `culori` v4.x (npm) — most precise JS color library
- `chroma.js` v3.x (npm) — popular, different design choices
- `colorspacious` v1.x (Python) — scientific color science
- `colour-science` v0.4.x (Python) — comprehensive reference
- `palette` v0.7 (Rust) — Rust ecosystem standard

**Estimated scope:** 15-20 nodes, ~200-300 tests.

### `semver`

**Elevator pitch:** Semantic version parsing, comparison, and range matching.

**Off-policy signals:**
- `^0.0.3` pins to exactly `0.0.3` (npm behavior). `^0.1.0` allows `0.1.x`. This
  three-tier behavior is the single most misimplemented semver feature.
- Pre-release ordering: `1.0.0-alpha` < `1.0.0-alpha.1` < `1.0.0-alpha.beta` <
  `1.0.0-beta` < `1.0.0-rc.1` < `1.0.0`. Numeric identifiers sort numerically,
  alphanumeric sort lexically, numeric < alphanumeric.
- Build metadata (`+build`) is ignored in precedence but preserved in output.
- Range intersection: `>=1.2.3 <2.0.0 || >=3.0.0` — the `||` vs implicit `&&` parsing.
- Tilde ranges: `~1.2.3` allows `>=1.2.3 <1.3.0` — different from caret.
- Hyphen ranges: `1.2.3 - 2.3.4` translates to `>=1.2.3 <=2.3.4`, but `1.2 - 2.3.4`
  translates to `>=1.2.0 <=2.3.4`.
- Pre-release matching in ranges: `>1.0.0-alpha.1` matches `1.0.0-alpha.2` but NOT
  `1.0.1-alpha.1` (must share major.minor.patch to match pre-releases).

**Cross-language demand:** Package managers, plugin systems, API versioning, feature flags.

**Cross-validation targets:**
- `semver` v7.x (npm) — the canonical reference implementation
- `semver` v1.x (Rust crate) — Rust ecosystem standard
- `packaging.version` v24.x (Python) — PEP 440-adjacent, different semantics (good contrast)
- `Semver` v3.x (Go) — `golang.org/x/mod/semver`

**Estimated scope:** 8-10 nodes, ~150-200 tests.

### `glob-match`

**Elevator pitch:** Glob pattern matching with well-defined edge-case semantics.

**Off-policy signals:**
- Does `*` match dotfiles? Bash says no, Python's `fnmatch` says yes.
- Does `**` match zero path segments? `a/**/b` matching `a/b` — some say yes, some no.
- Brace expansion nesting: `{a,{b,c}}` — does it flatten? Bash yes, some libs no.
- Character class edge cases: `[!a-z]` vs `[^a-z]` — which negation syntax?
- Escaped special characters in different OS conventions.
- Trailing separator: does `foo/` only match directories? Pure matching can't know.

**Cross-language demand:** Build tools, file watchers, .gitignore processing, asset pipelines.

**Cross-validation targets:**
- `micromatch` v4.x (npm) — most popular JS glob library
- `minimatch` v10.x (npm) — npm's own glob matcher
- `glob` v0.3 (Rust crate)
- `doublestar` v4.x (Go)

**Estimated scope:** 7-10 nodes, ~120-180 tests.

### `unit-convert`

**Elevator pitch:** Physical unit conversion with precise factor tables.

**Off-policy signals:**
- US cup = 236.588 mL vs metric cup = 250 mL vs Imperial cup = 284.131 mL.
- Food calorie (kcal) vs calorie (cal) — 1000x difference, constant source of bugs.
- IEC prefixes (KiB = 1024) vs SI prefixes (kB = 1000) — not interchangeable.
- Nautical mile = 1852 m exactly (by definition), vs statute mile = 1609.344 m.
- Troy ounce (31.1035 g) vs avoirdupois ounce (28.3495 g).
- Temperature conversions: affine (not multiplicative), Rankine exists.
- US fluid ounce (29.5735 mL) vs Imperial fluid ounce (28.4131 mL).

**Cross-language demand:** Scientific computing, cooking apps, IoT, engineering tools,
health/fitness.

**Cross-validation targets:**
- `convert-units` v3.x (npm)
- `pint` v0.24 (Python) — comprehensive unit library
- `uom` v0.36 (Rust crate)
- NIST reference tables (authoritative source for conversion factors)

**Estimated scope:** 12-18 nodes, ~200-250 tests.

---

## Tier 2: Good candidates

Solid off-policy content but narrower audience or trickier decomposition.

### `money`

**Off-policy signals:** Locale formatting (`$100` vs `100 EUR` vs `100,00 €`), banker's
rounding (round half to even), ISO 4217 minor units (JPY=0, BHD=3, most=2). Bigint
representation varies by language.

**Concern:** Locale data is enormous. May need to scope to formatting rules (not full CLDR).

**Estimated scope:** 10-14 nodes, ~150-200 tests.

### `csv-parse`

**Off-policy signals:** RFC 4180 edge cases — quoted fields containing newlines, BOM
handling, trailing comma as empty field vs ignored, CRLF vs LF normalization, embedded
quotes (`""` escaping), type inference thresholds for auto-detection.

**Concern:** Streaming/performance expectations may conflict with "not performance-critical."

**Estimated scope:** 8-12 nodes, ~120-180 tests.

### `json-pointer`

**Off-policy signals:** RFC 6901 (`~0`/`~1` escapes), RFC 6902 (JSON Patch — array index
shifting after remove, move semantics), RFC 7396 (merge patch — null means delete).
Minimal diff generation is algorithmically interesting.

**Concern:** Moderate audience. Most languages have built-in JSON support; pointer/patch
is niche.

**Estimated scope:** 8-10 nodes, ~100-150 tests.

### `human-number`

**Off-policy signals:** Ordinal exceptions (11th, 12th, 13th — not 11st, 12nd, 13rd),
compact notation thresholds (1.2K vs 1,200), IEC vs SI byte formatting, spelled-out
number hyphenation rules (twenty-one but eleven).

**Concern:** English-only limits cross-language audience (the logic is language-specific,
not programming-language-specific).

**Estimated scope:** 8-12 nodes, ~120-160 tests.

### `schedule`

**Off-policy signals:** Interval boundary semantics (open/closed/half-open), business
hours parsing conventions, slot-finding with granularity and padding, recurrence rules.

**Concern:** Timezone is nearly impossible to avoid. Overlap with `cron-expressions`.

**Estimated scope:** 8-12 nodes, ~120-180 tests.

---

## Tier 3: Worth exploring

Interesting off-policy content but structural concerns.

### `markdown-inline`

**Off-policy signals:** CommonMark emphasis rules (delimiter runs, left/right flanking),
link/image nesting, autolink detection, entity references.

**Concern:** Large spec surface. Must exclude block-level parsing to stay bounded, which
feels artificial.

### `geo-distance`

**Off-policy signals:** Vincenty convergence parameters (iteration limit, convergence
threshold for near-antipodal points), UTM zone exceptions (Svalbard, Norway).

**Concern:** Haversine is textbook (low off-policy). Value concentrates in Vincenty edge
cases and UTM zone table.

### `validation`

**Off-policy signals:** Email local-part rules (RFC 5321), IBAN check digit algorithm
(mod-97), ISBN-10 vs ISBN-13 check digit, Luhn algorithm for credit cards.

**Concern:** Heterogeneous grab-bag. Email validation alone could be a skill; combining
with IBAN/ISBN lacks cohesion.

### `text-diff`

**Off-policy signals:** Unified diff format rules (hunk headers, context lines), merge
conflict heuristics.

**Concern:** Myers diff is textbook. Performance-sensitive at scale. Value is in output
formatting, not the core algorithm.

---

## Top 3 detailed analysis

### 1. `cron-expressions` — Recommended first build

**Rationale:** Best ratio of off-policy density to implementation complexity. Universal
demand across backend systems. Clean decomposition with a natural pipeline structure.

#### Proposed node graph

```
token-types ──► tokenizer ──► parser ──► matcher
    (leaf)        (leaf)      (internal)  (internal)
                                  │            │
                                  ▼            ▼
                             validator    next-occurrence
                             (internal)     (internal)
                                               │
                                  ┌────────────┤
                                  ▼            ▼
                              nth-match    schedule
                              (internal)    (root)
```

**Nodes (10):**

| Node | Role | Purpose |
|------|------|---------|
| `token-types` | leaf | Token and AST type definitions |
| `tokenizer` | leaf | Lexes cron string into tokens |
| `field-range` | leaf | Defines valid ranges per field (minute: 0-59, hour: 0-23, etc.) |
| `parser` | internal | Tokens → structured cron expression (5 or 6 fields) |
| `validator` | internal | Validates parsed expression against field ranges |
| `matcher` | internal | Tests whether a given datetime matches a cron expression |
| `next-occurrence` | internal | Finds next datetime matching the expression after a given time |
| `nth-match` | internal | Finds the Nth future occurrence |
| `iterator` | internal | Lazy iteration over matching datetimes |
| `schedule` | root | Public API: parse, validate, match, next, iterate |

#### Example off-policy test vectors

```
# Day-of-week / day-of-month intersection (Vixie behavior)
@provenance vixie-cron semantics, verified against cron-parser v5.0.0
"0 0 15 * 5"  → matches Friday the 15th ONLY (intersection), not all Fridays and all 15ths

# Sunday = 0 and 7
@provenance POSIX.1-2017 and cron-parser v5.0.0
"0 0 * * 0"   → matches Sunday
"0 0 * * 7"   → matches Sunday (same as 0)

# Caret zero behavior
"*/0 * * * *"  → parse error (division by zero)

# Last day of February in leap year
@provenance croniter v3.0.0, verified 2025-01-15
next("0 0 L 2 *", 2024-02-01T00:00Z) → 2024-02-29T00:00Z  (leap year)
next("0 0 L 2 *", 2025-02-01T00:00Z) → 2025-02-28T00:00Z  (non-leap year)

# Step values with ranges
"10-20/3 * * * *" → minutes 10, 13, 16, 19
```

---

### 2. `color-space` — Highest off-policy coefficient density

**Rationale:** Precise numerical coefficients that LLMs consistently get wrong. Enormous
cross-language demand. Excellent subset extraction — users often need just one or two
conversion paths.

#### Proposed node graph

```
                                  ┌──────────────┐
                                  │  color-types  │ (leaf)
                                  └──────┬───────┘
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                     srgb-linear    hsl-convert    hwb-convert
                      (internal)    (internal)     (internal)
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          xyz-d65     xyz-d50     oklab
         (internal)  (internal)  (internal)
              │           │           │
              ▼           ▼           ▼
          lab-d65     lab-d50     oklch
         (internal)  (internal)  (internal)
              │
              ▼
          lch-d65
         (internal)
                          │
                          ▼
                    gamut-map ──────► convert
                    (internal)        (root)
```

**Nodes (16):**

| Node | Role | Purpose |
|------|------|---------|
| `color-types` | leaf | RGB, HSL, HWB, Lab, LCH, Oklab, Oklch, XYZ type definitions |
| `srgb-linear` | internal | sRGB ↔ linear RGB (gamma transfer function with exact threshold) |
| `hsl-convert` | internal | RGB ↔ HSL (achromatic edge case, hue modulo) |
| `hwb-convert` | internal | RGB ↔ HWB (whiteness + blackness > 1 normalization) |
| `xyz-d65` | internal | Linear RGB ↔ XYZ D65 (3x3 matrix, exact coefficients) |
| `xyz-d50` | internal | XYZ D65 ↔ XYZ D50 (Bradford chromatic adaptation matrix) |
| `lab-d65` | internal | XYZ D65 ↔ CIELAB D65 (cube root transfer, delta threshold) |
| `lab-d50` | internal | XYZ D50 ↔ CIELAB D50 |
| `lch-d65` | internal | Lab D65 ↔ LCH D65 (atan2/cos/sin, achromatic hue = 0) |
| `oklab` | internal | Linear RGB ↔ Oklab (M1, M2 matrices, cube root) |
| `oklch` | internal | Oklab ↔ Oklch (same polar conversion as LCH) |
| `gamut-map` | internal | Out-of-gamut detection and mapping (clamp, Oklch chroma reduction) |
| `parse-color` | internal | CSS color string → typed color value |
| `serialize-color` | internal | Typed color value → CSS color string |
| `delta-e` | internal | Color difference metrics (CIE76, CIE2000) |
| `convert` | root | Public API: convert between any two supported spaces |

#### Example off-policy test vectors

```
# sRGB gamma threshold
@provenance IEC 61966-2-1:1999, clause 4.2
srgb_to_linear(0.04045)  → 0.003130804953560372  (exact breakpoint)
srgb_to_linear(0.04046)  → uses gamma formula (value > threshold)
srgb_to_linear(0.04044)  → uses linear formula (value <= threshold... wait, 0.04045 IS the threshold)
# The threshold is 0.04045, NOT 0.003130. 0.003130 is the LINEAR-side breakpoint.

# Bradford matrix (D65 → D50)
@provenance ICC specification, hunt-pointer-estevez variant
M = [[ 1.0479298208405488,  0.0229468746144671, -0.0501922295431356],
     [ 0.0296278156881593,  0.9904344267538799, -0.0170738250293851],
     [-0.0092430581525912,  0.0150551448965779,  0.7521316354461029]]

# Oklab M1 matrix (LMS from linear sRGB)
@provenance Björn Ottosson, 2020-12-24, https://bottosson.github.io/posts/oklab/
M1 = [[ 0.4122214708, 0.5363325363, 0.0514459929],
      [ 0.2119034982, 0.6806995451, 0.1073969566],
      [ 0.0883024619, 0.2817188376, 0.6299787005]]
```

---

### 3. `semver` — Universal need, concentrated value

**Rationale:** Every software ecosystem needs semver. The off-policy value concentrates
in range matching edge cases that are well-defined by npm's implementation but poorly
reproduced by LLMs.

#### Proposed node graph

```
                    ┌────────────┐
                    │ semver-type │ (leaf)
                    └─────┬──────┘
                          │
                    ┌─────┴──────┐
                    ▼            ▼
                 parse       compare
                (internal)   (internal)
                    │            │
                    ▼            ▼
              range-parse   satisfies
              (internal)    (internal)
                    │            │
                    ▼            ▼
              range-set     max-satisfying
              (internal)    (internal)
                                 │
                                 ▼
                              semver
                              (root)
```

**Nodes (9):**

| Node | Role | Purpose |
|------|------|---------|
| `semver-types` | leaf | SemVer, Comparator, Range type definitions |
| `parse` | internal | String → SemVer (with pre-release and build metadata) |
| `compare` | internal | SemVer comparison (pre-release ordering rules) |
| `range-parse` | internal | Range string → Range AST (`^`, `~`, hyphen, `\|\|`, `*`) |
| `range-set` | internal | Normalize range AST to comparator sets |
| `satisfies` | internal | Does a version satisfy a range? |
| `max-satisfying` | internal | Find highest version in a list satisfying a range |
| `coerce` | internal | Lenient parsing ("v1", "1.2", "=1.2.3" → SemVer) |
| `semver` | root | Public API: parse, compare, satisfies, maxSatisfying, coerce |

#### Example off-policy test vectors

```
# Caret zero behavior — the single most misimplemented feature
@provenance npm semver v7.7.0, verified 2025-01-20
satisfies("0.0.3", "^0.0.3")    → true   (pins to exactly 0.0.3)
satisfies("0.0.4", "^0.0.3")    → false  (NOT >= 0.0.3 < 0.1.0)
satisfies("0.1.0", "^0.1.0")    → true
satisfies("0.1.5", "^0.1.0")    → true   (allows 0.1.x)
satisfies("0.2.0", "^0.1.0")    → false
satisfies("1.2.3", "^1.2.3")    → true
satisfies("1.9.9", "^1.2.3")    → true   (allows 1.x.x where x >= 2.3)

# Pre-release ordering
@provenance semver.org v2.0.0 specification, §11
compare("1.0.0-alpha", "1.0.0-alpha.1")     → -1
compare("1.0.0-alpha.1", "1.0.0-alpha.beta") → -1  (numeric < alpha)
compare("1.0.0-alpha.beta", "1.0.0-beta")   → -1
compare("1.0.0-beta", "1.0.0-beta.2")       → -1
compare("1.0.0-beta.2", "1.0.0-beta.11")    → -1   (numeric sort: 2 < 11)
compare("1.0.0-beta.11", "1.0.0-rc.1")      → -1
compare("1.0.0-rc.1", "1.0.0")              → -1   (pre-release < release)

# Pre-release range matching — subtle
@provenance npm semver v7.7.0
satisfies("1.0.1-alpha.1", ">1.0.0-alpha.2") → false  (different patch: 1.0.1 ≠ 1.0.0)
satisfies("1.0.0-alpha.3", ">1.0.0-alpha.2") → true   (same tuple, higher pre-release)

# Build metadata ignored in precedence
compare("1.0.0+build1", "1.0.0+build2") → 0  (equal precedence)
```

---

## Recommendation

**Build `cron-expressions` first.** Rationale:

1. **Smallest scope** of the top 3 (~10 nodes vs 16 for color-space) — fastest path to
   validating the skill creation pipeline with a new domain.
2. **Most decisive off-policy content** — every edge case has a clear "correct" answer
   backed by Vixie/POSIX semantics; no need for judgment calls about which convention to
   follow.
3. **Cleanest cross-validation** — `cron-parser` (npm) and `croniter` (Python) are
   well-established with clear documented behavior.
4. **Pipeline structure** (tokenizer → parser → matcher → iterator) mirrors the proven
   `math-expression-parser` architecture, reducing design risk.

After `cron-expressions`, build `color-space` (broadest audience) then `semver` (most
universal demand).

## Cross-validation library versions

| Skill | Library | Language | Version | Notes |
|-------|---------|----------|---------|-------|
| `cron-expressions` | `cron-parser` | JS (npm) | v5.0.0 | Most popular, Vixie semantics |
| `cron-expressions` | `croniter` | Python | v3.0.0 | Python standard |
| `cron-expressions` | Quartz | Java | v2.5.0 | Different semantics (1-7 DoW) — good contrast |
| `cron-expressions` | `cron` | Rust | v0.15.0 | Rust ecosystem standard |
| `color-space` | `culori` | JS (npm) | v4.0.0 | High-precision reference |
| `color-space` | `chroma.js` | JS (npm) | v3.1.0 | Different design choices |
| `color-space` | `colour-science` | Python | v0.4.6 | Comprehensive scientific reference |
| `color-space` | `palette` | Rust | v0.7.6 | Rust ecosystem standard |
| `semver` | `semver` | JS (npm) | v7.7.0 | Canonical reference |
| `semver` | `semver` | Rust | v1.0.23 | Rust ecosystem standard |
| `semver` | `golang.org/x/mod/semver` | Go | v0.22.0 | Go standard library extension |
| `semver` | `packaging.version` | Python | v24.2 | PEP 440 — different spec, good contrast |

## Open questions

1. Should `cron-expressions` support 6-field (with seconds) or 7-field (with year) expressions,
   or only standard 5-field? Recommendation: 5-field standard + optional 6-field seconds.
2. For `color-space`, should we include CSS Color Level 4 `color()` function parsing, or
   keep parsing as a separate concern? Recommendation: include basic CSS parsing as it
   drives adoption.
3. For `semver`, should we match npm semantics exactly, or document where we diverge?
   Recommendation: match npm exactly — it's the de facto standard.
