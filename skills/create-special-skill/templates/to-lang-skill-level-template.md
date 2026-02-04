# {{skill-name}} → {{Language}}

## Type mappings

- {{TypeScript type → target language type, e.g. "number[] → list[float]"}}
- {{Options/config objects → target idiom, e.g. "interfaces → dataclass" or "interfaces → struct"}}
- {{Result types → target idiom, e.g. "return object → return tuple" or "→ Result<T, E>"}}

## Error handling

- {{Error pattern, e.g. "throw → raise ValueError" or "throw → return Err()" or "throw → return (T, error)"}}

## Testing

- {{Test framework and patterns, e.g. "Use pytest with parametrize" or "Use #[cfg(test)] module"}}
- {{Assertion style, e.g. "Use pytest.approx for floats" or "Use assert_relative_eq!"}}

## Dependencies

- {{External dependency guidance, e.g. "numpy is unnecessary — use list comprehensions"}}

## Idioms

- {{Language-specific patterns, e.g. "Use list comprehension instead of map/filter"}}
- {{Naming conventions, e.g. "snake_case functions" or "PascalCase exported, camelCase unexported"}}

## Documentation

- {{Doc comment format for this language, e.g. "Use Google-style docstrings with Args/Returns sections"}}
- {{Include @param/@returns or equivalent for all public functions}}
- {{Provenance format for this language, e.g. "Module-level docstring with generation metadata"}}
