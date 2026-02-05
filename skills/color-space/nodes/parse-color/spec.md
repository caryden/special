# parse-color — Spec

Depends on: color-types

## Purpose

Parse CSS color strings into typed color values. Supports hex notation, named colors,
and functional notation for rgb(), hsl(), hwb(), oklab(), and oklch().

## Supported Formats

@provenance: CSS Color Level 4, sections 4-8

| Format | Examples | Output space |
|--------|----------|-------------|
| Hex `#RGB` | `#f00` | srgb |
| Hex `#RRGGBB` | `#ff8000` | srgb |
| Hex `#RGBA` | `#f00f` | srgb (alpha ignored) |
| Hex `#RRGGBBAA` | `#ff0000ff` | srgb (alpha ignored) |
| Named colors | `red`, `blue`, `coral` | srgb |
| `rgb()` / `rgba()` | `rgb(255, 0, 0)`, `rgb(100%, 50%, 0%)` | srgb |
| `hsl()` / `hsla()` | `hsl(0, 100%, 50%)`, `hsl(120deg, 50%, 75%)` | hsl |
| `hwb()` | `hwb(0 0% 0%)` | hwb |
| `oklab()` | `oklab(0.5 0.1 -0.1)` | oklab |
| `oklch()` | `oklch(0.7 0.15 180)` | oklch |

### Named Colors (subset)

The parser includes a subset of 37 CSS named colors: black, white, red, green, blue,
yellow, cyan, magenta, gray, grey, silver, maroon, olive, lime, aqua, teal, navy,
fuchsia, purple, orange, pink, brown, coral, crimson, gold, indigo, ivory, khaki,
lavender, plum, salmon, sienna, tan, tomato, turquoise, violet, wheat.

### Angle Units

| Unit | Conversion |
|------|------------|
| `deg` (or no unit) | Identity |
| `rad` | `degrees = radians * 180 / PI` |
| `turn` | `degrees = turns * 360` |

### Component Parsing

- Integer values in `rgb()`: divided by 255.
- Percentage values (ending with `%`): divided by 100.
- Both comma-separated and space-separated syntax supported for `rgb()`.

## Algorithm

1. Trim and lowercase the input.
2. Check named color lookup table. If found, convert `[0-255]` values to `[0-1]` sRGB.
3. If starts with `#`: parse as hex.
4. If starts with `rgb`/`hsl`/`hwb`/`oklab`/`oklch`: parse as functional notation using regex.
5. Otherwise: throw error.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parseColor` | `(input: string) -> Color` | Parse a CSS color string into a typed color value |

## Test Vectors

@provenance: CSS Color Level 4

| Input | Expected |
|-------|----------|
| `"#f00"` | srgb `(1, 0, 0)` |
| `"#ff8000"` | srgb `(1, ~0.502, 0)` |
| `"#f00f"` | srgb `(1, 0, 0)` (alpha ignored) |
| `"#ff0000ff"` | srgb `(1, 0, 0)` (alpha ignored) |
| `"#FF0000"` | srgb `(1, 0, 0)` (case insensitive) |
| `"red"` | srgb `(1, 0, 0)` |
| `"black"` | srgb `(0, 0, 0)` |
| `"white"` | srgb `(1, 1, 1)` |
| `"  RED  "` | srgb (whitespace trimmed, case insensitive) |
| `"grey"` / `"gray"` | Same srgb values |
| `"rgb(255, 0, 0)"` | srgb `(1, 0, 0)` |
| `"rgb(100%, 50%, 0%)"` | srgb `(1, 0.5, 0)` |
| `"rgb(255 128 0)"` | srgb `(1, ~0.502, 0)` (space-separated) |
| `"rgba(255, 0, 0, 0.5)"` | srgb `(1, 0, 0)` |
| `"hsl(0, 100%, 50%)"` | hsl `(0, 1, 0.5)` |
| `"hsl(120deg, 50%, 75%)"` | hsl `(120, ...)` |
| `"hsl(3.14159rad, 100%, 50%)"` | hsl `(~180, ...)` |
| `"hsl(0.5turn, 100%, 50%)"` | hsl `(180, ...)` |
| `"hwb(0 0% 0%)"` | hwb `(0, 0, 0)` |
| `"oklab(0.5 0.1 -0.1)"` | oklab `(0.5, 0.1, -0.1)` |
| `"oklch(0.7 0.15 180)"` | oklch `(0.7, 0.15, 180)` |
| `"oklch(0.7 0.15 180deg)"` | oklch `(0.7, 0.15, 180)` |

## Edge Cases

- **Whitespace**: Leading/trailing whitespace is trimmed.
- **Case insensitivity**: All input is lowercased before parsing.
- **Alpha channel**: Hex `#RGBA` and `#RRGGBBAA` formats parse the alpha but it is ignored (only RGB extracted).
- **grey vs gray**: Both spellings map to the same sRGB value.
- **Alpha discarded**: Alpha channel values in rgba(), hsla(), hex (#RRGGBBAA, #RGBA) are accepted but silently discarded. The Color types do not include an alpha component.

## Error Cases

| Input | Error |
|-------|-------|
| `""` (empty string) | Throws: cannot parse |
| `"notacolor"` (unknown name) | Throws: cannot parse |
| `"#xyz"` (invalid hex digits) | Throws: invalid hex color |
| `"#12345"` (wrong hex length) | Throws: invalid hex color |
| `"rgb()"` (no arguments) | Throws: invalid rgb() |
| `"hsl()"` (no arguments) | Throws: invalid hsl() |
| `"hwb()"` (no arguments) | Throws: invalid hwb() |
| `"oklab()"` (no arguments) | Throws: invalid oklab() |
| `"oklch()"` (no arguments) | Throws: invalid oklch() |
