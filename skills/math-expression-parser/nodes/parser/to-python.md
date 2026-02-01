# parser → Python

- Use a closure-based approach: define inner functions that capture a `pos` variable
  - Python alternative: use a mutable container `pos = [0]` or a simple class/object
    to hold parser state, since inner functions can't rebind nonlocal ints in Python 2
  - In Python 3: `nonlocal pos` works
- Each precedence level is a function: `parse_add_sub()`, `parse_mul_div()`,
  `parse_power()`, `parse_unary()`, `parse_atom()`
- `peek()` returns `tokens[pos]` or `None` if past end
- Raise `ValueError` for parse errors
- Right-associativity for `**`: call `parse_power()` recursively (not `parse_unary()`)
  for the exponent
