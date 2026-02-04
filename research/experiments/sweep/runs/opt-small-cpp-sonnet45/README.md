# Optimization Library - C++ Translation

Translation of 3 nodes from the optimization skill to C++:
- vec-ops
- result-types
- nelder-mead

## Build and Test

```bash
# Download doctest (if needed):
python3 download_doctest.py

# Or use the stub doctest.h that's already in include/

# Build and test:
cmake -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

## Structure

```
include/
  doctest.h          - Test framework
  vec_ops.h          - Vector operations
  result_types.h     - Result types and convergence logic
  nelder_mead.h      - Nelder-Mead optimizer

src/
  vec_ops.cpp
  result_types.cpp
  nelder_mead.cpp

tests/
  test_vec_ops.cpp
  test_result_types.cpp
  test_nelder_mead.cpp
  test_main.cpp      - Empty (main is in doctest.h)
```

## Notes

- C++17 standard
- Zero external dependencies
- Header-only doctest stub included
