#!/usr/bin/env bash
# Cross-validate all 9 mathexpr implementations against REF test vectors.
# Python uses the Python cross-validate script; Rust/Go run their built-in tests.
set -e

echo "============================================================"
echo "MATHEXPR CROSS-VALIDATION: Python (via REF test vectors)"
echo "============================================================"
python3 /home/user/special/experiments/mathexpr-cross-validate.py

echo ""
echo "============================================================"
echo "MATHEXPR CROSS-VALIDATION: Rust (self-tests)"
echo "============================================================"
for variant in ref spec prompt; do
    dir="/home/user/special/experiments/mathexpr-${variant}-rust"
    echo ""
    echo "--- ${variant}-rust ---"
    cd "$dir"
    result=$(cargo test 2>&1)
    # Extract the summary line
    echo "$result" | grep "^test result:" | head -1
done

echo ""
echo "============================================================"
echo "MATHEXPR CROSS-VALIDATION: Go (self-tests)"
echo "============================================================"
for variant in ref spec prompt; do
    dir="/home/user/special/experiments/mathexpr-${variant}-go"
    echo ""
    echo "--- ${variant}-go ---"
    cd "$dir"
    result=$(go test ./... 2>&1)
    echo "$result" | grep -E "^(ok|FAIL|---)" | head -5
done
