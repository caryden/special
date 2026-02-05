---
name: color-space
description: Generate native color space conversions with exact coefficients and transfer functions — sRGB, HSL, HWB, CIELAB, LCH, Oklab, Oklch, XYZ — from a verified TypeScript reference
argument-hint: "<nodes> [--lang <language>] or 'help' — specify nodes to generate, target language, or get guidance"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# color-space

Convert between color spaces as pure functions with exact coefficients. Supports
sRGB, Linear RGB, HSL, HWB, CIE XYZ (D65 and D50), CIELAB (D65 and D50),
LCH (D65), Oklab, Oklch, CSS color parsing/serialization, gamut mapping, and
color difference metrics (CIEDE2000).

## Design principles

- **Pure functions only** — every function takes explicit inputs; no global state.
- **Exact coefficients** — all matrices, thresholds, and constants use values from
  authoritative sources (IEC 61966-2-1, ICC specification, Björn Ottosson's Oklab).
- **Clarity over performance** — reference code prioritizes readability.
- **No external dependencies** — zero runtime dependencies.

## Input

`$ARGUMENTS` accepts:
- **`help`**: Interactive guide to choosing the right nodes and language for your use case
- **Nodes**: space-separated node names to generate (or `all` for the full library)
- **--lang \<language\>**: target language (default: `typescript`). Supported: `python`, `rust`, `go`, `typescript`

Examples:
- `help` — walk through choosing which nodes you need
- `srgb-linear` — generate sRGB ↔ linear RGB conversion in TypeScript
- `oklab oklch --lang python` — generate Oklab + Oklch conversions in Python
- `all --lang rust` — generate the full library in Rust

## Handling `help`

When `$ARGUMENTS` is `help`, read `HELP.md` and use it to guide the user through
node and language selection. The help guide contains a decision tree and common
use-case recipes. Walk through it interactively, asking the user about their
requirements, then recommend specific nodes and a target language.

## Node Graph

```
color-types ─────────────────┬──► srgb-linear ──┬──► xyz-d65 ──┬──► xyz-d50 ──► lab-d50
  (leaf)                     │     (internal)    │   (internal)  │   (internal)  (internal)
                             │                   │               │
                             │                   │               ├──► lab-d65 ──► lch-d65
                             │                   │               │   (internal)  (internal)
                             │                   │               │
                             │                   ├──► oklab ─────┼──► oklch
                             │                   │   (internal)  │   (internal)
                             │                   │               │
                             ├──► hsl-convert    │               ├──► delta-e
                             │     (internal)    │               │   (internal)
                             │                   │               │
                             ├──► hwb-convert    ├──► oklab ─────┴──► gamut-map
                             │     (internal)    │                     (internal)
                             │                   │
                             ├──► parse-color    │
                             │     (internal)    │
                             │                   │
                             ├──► serialize-color│
                             │     (internal)    │
                             │                   │
                             └───────────────────┴──► convert
                                                       (root)
```

### Nodes

| Node | Type | Depends On | Description |
|------|------|-----------|-------------|
| `color-types` | leaf | — | Color value types for all supported spaces, factory functions |
| `srgb-linear` | internal | color-types | sRGB ↔ linear RGB gamma transfer (IEC 61966-2-1 threshold) |
| `hsl-convert` | internal | color-types | sRGB ↔ HSL conversion (achromatic edge case, hue modulo) |
| `hwb-convert` | internal | color-types | sRGB ↔ HWB conversion (whiteness+blackness>1 normalization) |
| `xyz-d65` | internal | color-types, srgb-linear | Linear RGB ↔ CIE XYZ D65 (3×3 matrix) |
| `xyz-d50` | internal | color-types, xyz-d65 | XYZ D65 ↔ XYZ D50 (Bradford chromatic adaptation matrix) |
| `oklab` | internal | color-types, srgb-linear | Linear RGB ↔ Oklab (M1, M2 matrices, cube root) |
| `oklch` | internal | color-types, oklab | Oklab ↔ Oklch (polar conversion, achromatic hue) |
| `lab-d65` | internal | color-types, xyz-d65 | XYZ D65 ↔ CIELAB D65 (cube root transfer, ε/κ thresholds) |
| `lab-d50` | internal | color-types, xyz-d50 | XYZ D50 ↔ CIELAB D50 (same formula, D50 illuminant) |
| `lch-d65` | internal | color-types, lab-d65 | Lab D65 ↔ LCH D65 (polar conversion, achromatic hue = 0) |
| `delta-e` | internal | color-types, lab-d65, oklch | Color difference: CIE76 and CIEDE2000 |
| `gamut-map` | internal | color-types, srgb-linear, oklab, oklch | Out-of-gamut detection and Oklch chroma reduction |
| `parse-color` | internal | color-types | CSS color string → typed color value |
| `serialize-color` | internal | color-types | Typed color value → CSS color string |
| `convert` | root | color-types, srgb-linear, hsl-convert, hwb-convert, xyz-d65, xyz-d50, oklab, oklch, lab-d65, lab-d50, lch-d65 | Convert between any two supported color spaces |

### Subset Extraction

- **sRGB gamma only**: `color-types` + `srgb-linear`
- **HSL manipulation**: `color-types` + `hsl-convert`
- **Oklab/Oklch perceptual**: `color-types` + `srgb-linear` + `oklab` + `oklch`
- **CIELAB D65**: `color-types` + `srgb-linear` + `xyz-d65` + `lab-d65`
- **Color difference**: add `delta-e` to CIELAB or Oklch subsets
- **Gamut mapping**: `color-types` + `srgb-linear` + `oklab` + `oklch` + `gamut-map`
- **CSS parsing**: `color-types` + `parse-color`
- **Full library**: all 16 nodes (use `all`; `convert` covers 12 of 16 — does not include `delta-e`, `gamut-map`, `parse-color`, `serialize-color`)

## Key Design Decisions

### sRGB gamma transfer threshold

@provenance IEC 61966-2-1:1999, clause 4.2

The sRGB transfer function has a linear segment below a threshold and a gamma
curve above it. The threshold value is **0.04045** on the sRGB side (and
**0.0031308** on the linear side). LLMs frequently hallucinate incorrect values.

| Parameter | Value | Source |
|-----------|-------|--------|
| sRGB threshold | 0.04045 | IEC 61966-2-1:1999 |
| Linear threshold | 0.0031308 | Derived: 0.04045 / 12.92 |
| Gamma | 2.4 | IEC 61966-2-1:1999 |
| Linear slope | 12.92 | IEC 61966-2-1:1999 |
| Offset | 0.055 | IEC 61966-2-1:1999 |

### D65 reference white

@provenance CIE 15:2004, 2-degree standard observer

| Component | Value |
|-----------|-------|
| Xn | 0.95047 |
| Yn | 1.0 |
| Zn | 1.08883 |

### D50 reference white

@provenance ICC specification

| Component | Value |
|-----------|-------|
| Xn | 0.96422 |
| Yn | 1.0 |
| Zn | 0.82521 |

### sRGB to XYZ D65 matrix

@provenance IEC 61966-2-1:1999, derived from sRGB primaries and D65 white point

```
M = [[ 0.4123907992659595,  0.357584339383878,   0.1804807884018343 ],
     [ 0.21263900587151027, 0.715168678767756,    0.07219231536073371],
     [ 0.01933081871559182, 0.11919477979462598,  0.9505321522496607 ]]
```

### Bradford chromatic adaptation (D65 → D50)

@provenance ICC specification

```
M = [[ 1.0479298208405488,  0.022946793341019088, -0.05019222954313557],
     [ 0.029627815688159344, 0.990434429065321,   -0.01707382502938514],
     [-0.009243058152591178, 0.015055144896577895,  0.7521316354461029]]
```

### Oklab matrices

@provenance Björn Ottosson, 2020-12-24, https://bottosson.github.io/posts/oklab/

**M1 (linear sRGB → LMS):**
```
[[ 0.4122214708, 0.5363325363, 0.0514459929],
 [ 0.2119034982, 0.6806995451, 0.1073969566],
 [ 0.0883024619, 0.2817188376, 0.6299787005]]
```

**M2 (LMS^(1/3) → Lab):**
```
[[ 0.2104542553, 0.7936177850, -0.0040720468],
 [ 1.9779984951, -2.4285922050, 0.4505937099],
 [ 0.0259040371, 0.7827717662, -0.8086757660]]
```

### CIELAB thresholds

@provenance CIE 15:2004

| Parameter | Value | Description |
|-----------|-------|-------------|
| ε (epsilon) | 216/24389 ≈ 0.008856 | Cube root threshold |
| κ (kappa) | 24389/27 ≈ 903.3 | Linear slope |

### HSL achromatic handling

When saturation is 0 (achromatic/gray), hue is undefined. Convention: return hue = 0.
When converting back, `S = 0` means hue is ignored and R = G = B = L.

### HWB normalization

@provenance CSS Color Level 4, §7.2

When whiteness + blackness ≥ 1, the color is a shade of gray. Normalize by
dividing both by their sum, then the RGB value is `whiteness / (whiteness + blackness)`.

## Process

1. If `$ARGUMENTS` is `help`, read `HELP.md` and guide the user interactively
2. Read this file for the node graph and design decisions
3. For each requested node (in dependency order), read `nodes/<name>/spec.md`
4. Read `nodes/<name>/to-<lang>.md` for target-language translation hints
5. Generate implementation + tests
6. If the spec is ambiguous, consult `reference/src/<name>.ts` (track what you consulted and why)
7. Run tests — all must pass before proceeding to the next node

### Generated Code Documentation

Every public function, class, type, and interface in generated code must have
idiomatic doc comments in the target language's standard format:

| Language | Format |
|----------|--------|
| TypeScript | JSDoc (`/** */`) with `@param`, `@returns` |
| Python | Google-style docstrings with Args, Returns, Raises |
| Kotlin/Java | KDoc/JavaDoc (`/** */`) with `@param`, `@return`, `@throws` |
| C# | XML doc comments (`///`) with `<summary>`, `<param>`, `<returns>` |
| Go | GoDoc comments (starting with the function/type name) |
| Rust | `///` doc comments with `# Arguments`, `# Returns`, `# Errors` |
| C++ | Doxygen (`/**` or `///`) with `@brief`, `@param`, `@return` |
| Swift | DocC (`///`) with `- Parameters:`, `- Returns:`, `- Throws:` |

Doc comments should describe **what** the function does, its parameters, return
value, and error conditions. Derive content from the node spec — do not invent
behavior not in the spec.

Each generated file must include a **provenance header** as the first comment,
in the file's idiomatic comment style:

```
Generated by {agent} using {model}
From special:color-space (https://github.com/caryden/special)
Node: {node-name}
```

## Error Handling

- `parseColor` throws on unparseable color strings
- Conversion functions accept out-of-range inputs (no clamping unless gamut-map is used)
- `gamutMapOklch` returns a clamped sRGB value; `isInGamut` is a pure predicate
- All other functions are total (no error cases)

## Reference

The TypeScript reference implementation is in `reference/src/`. It is the
authoritative source — consult it when specs are ambiguous, but prefer the
spec and translation hints as primary sources.

All reference code has 100% line and function coverage via `bun test --coverage`.
