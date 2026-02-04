# Math Expression Parser - C++ Translation

## Run: mathexpr-full-cpp-sonnet45

Complete translation of the math-expression-parser skill to C++17 using doctest framework.

### Nodes Translated (6/6)

1. **token-types** (leaf) - Token kinds and factory function
2. **ast-types** (leaf) - AST node types with tagged union pattern
3. **tokenizer** (depends: token-types) - Character-by-character lexer
4. **parser** (depends: token-types, ast-types) - Recursive descent parser with proper precedence
5. **evaluator** (depends: ast-types) - AST evaluation via tree walk
6. **evaluate** (root) - End-to-end pipeline: string → tokens → AST → result

### Test Results

- **Test cases**: 25/25 passed ✓
- **Assertions**: 156/156 passed ✓
- **Build**: Success ✓
- **Framework**: doctest 2.4.11
- **Standard**: C++17
- **Compiler**: AppleClang 17.0.0.17000603

### Build Instructions

```bash
cmake -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

### Translation Approach

- Used C++17 standard library (no external dependencies except doctest)
- Implemented AST as inheritance hierarchy with shared_ptr for node ownership
- Used enum classes for type safety (TokenKind, AstNodeType)
- Recursive descent parser with proper precedence levels
- All test vectors from specs implemented and passing
- Error handling via std::runtime_error with descriptive messages

### Project Structure

```
include/           - Public headers
  token_types.h
  ast_types.h
  tokenizer.h
  parser.h
  evaluator.h
  evaluate.h
  doctest.h       - Test framework
src/              - Implementation files
tests/            - Test files (one per node)
CMakeLists.txt    - Build configuration
```
