"""
Cross-validate mathexpr implementations against the REF test vectors.
Tests end-to-end calc() behavior across all Python implementations.
"""
import importlib.util
import math

def load_module(path, name):
    import sys
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod  # required for dataclass introspection
    spec.loader.exec_module(mod)
    return mod

# End-to-end calc test vectors from the reference
CALC_TESTS = [
    # Basic arithmetic
    ("1 + 2", 3),
    ("10 - 3", 7),
    ("4 * 5", 20),
    ("15 / 4", 3.75),
    ("10 % 3", 1),
    ("2 ** 8", 256),
    # Precedence
    ("2 + 3 * 4", 14),
    ("2 * 3 + 4", 10),
    ("10 - 2 * 3", 4),
    ("2 + 3 ** 2", 11),
    ("2 * 3 ** 2", 18),
    ("2 ** 3 * 4", 32),
    # Parentheses
    ("(2 + 3) * 4", 20),
    ("2 * (3 + 4)", 14),
    ("(2 + 3) * (4 + 5)", 45),
    ("((1 + 2) * (3 + 4))", 21),
    ("(10)", 10),
    # Associativity
    ("1 - 2 - 3", -4),
    ("1 - 2 + 3", 2),
    ("12 / 3 / 2", 2),
    ("2 ** 3 ** 2", 512),
    # Unary minus
    ("-5", -5),
    ("--5", 5),
    ("-(-5)", 5),
    ("2 * -3", -6),
    ("-2 ** 2", 4),
    ("-(2 ** 2)", -4),
    # Decimals
    ("3.14 * 2", 6.28),
    (".5 + .5", 1),
    # Complex
    ("2 + 3 * 4 - 1", 13),
    ("(2 + 3) * (4 - 1) / 5", 3),
    ("10 % 3 + 2 ** 3", 9),
    ("2 ** (1 + 2)", 8),
    ("100 / 10 / 2 + 3", 8),
]

# Error cases: these should throw
CALC_ERRORS = [
    "",
    "   ",
    "1 / 0",
    "5 % 0",
    "(2 + 3",
    "2 @ 3",
    "2 +",
]


def test_implementation(label, mod):
    calc_fn = getattr(mod, 'calc', None)
    if not calc_fn:
        print(f"\n{'='*60}")
        print(f"{label}: NO calc() FUNCTION FOUND")
        print(f"{'='*60}")
        return 0, 0, []

    passed = 0
    failed = 0
    errors = []

    for expr, expected in CALC_TESTS:
        try:
            result = calc_fn(expr)
            if isinstance(expected, float):
                if math.isclose(result, expected, rel_tol=1e-9):
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  calc({expr!r}): expected={expected}, got={result}")
            else:
                if result == expected:
                    passed += 1
                else:
                    failed += 1
                    errors.append(f"  calc({expr!r}): expected={expected}, got={result}")
        except Exception as e:
            failed += 1
            errors.append(f"  calc({expr!r}): EXCEPTION {e}")

    for expr in CALC_ERRORS:
        try:
            result = calc_fn(expr)
            failed += 1
            errors.append(f"  calc({expr!r}): expected error, got={result}")
        except Exception:
            passed += 1

    total = passed + failed
    print(f"\n{'='*60}")
    print(f"{label}: {passed}/{total} passed ({failed} failures)")
    print(f"{'='*60}")
    if errors:
        for e in errors[:20]:
            print(e)
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more failures")
    return passed, total, errors


if __name__ == "__main__":
    results = {}

    for variant in ["ref-python", "spec-python", "prompt-python"]:
        path = f"/home/user/special/experiments/mathexpr-{variant}/mathexpr.py"
        try:
            mod = load_module(path, f"mathexpr_{variant.replace('-','_')}")
            p, t, errs = test_implementation(variant, mod)
            results[variant] = (p, t, errs)
        except Exception as e:
            print(f"\n{variant}: FAILED TO LOAD — {e}")
            results[variant] = (0, 0, [str(e)])

    print("\n\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    total_vectors = len(CALC_TESTS) + len(CALC_ERRORS)
    for variant, (p, t, errs) in results.items():
        status = "PASS" if p == t and t > 0 else "FAIL"
        print(f"  {variant}: {p}/{t} [{status}]")
