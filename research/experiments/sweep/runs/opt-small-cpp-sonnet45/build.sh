#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Configuring..."
cmake -B build

echo "Building..."
cmake --build build

echo "Running tests..."
ctest --test-dir build --output-on-failure
