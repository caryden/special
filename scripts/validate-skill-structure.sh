#!/usr/bin/env bash
# Validate that every production skill has complete structure:
#   - Each node in SKILL.md has spec.md, to-python.md, to-rust.md, to-go.md
#   - Each node has a .ts source and .test.ts file in reference/src/
#
# Usage: ./scripts/validate-skill-structure.sh [skills-dir]

set -euo pipefail

SKILLS_DIR="${1:-skills}"
ERRORS=0

for skill_md in "$SKILLS_DIR"/*/SKILL.md; do
  skill_dir="$(dirname "$skill_md")"
  skill_name="$(basename "$skill_dir")"

  # Skip meta-skills (no reference implementation)
  if [ ! -d "$skill_dir/reference" ]; then
    continue
  fi

  echo "=== $skill_name ==="

  # Extract node names from the SKILL.md node table.
  # Matches lines like: | `node-name` | type | ...
  nodes=$(grep -oP '^\|\s*`\K[a-z][a-z0-9-]*(?=`)' "$skill_md" || true)

  if [ -z "$nodes" ]; then
    echo "  WARNING: no nodes found in $skill_md"
    continue
  fi

  node_count=0
  for node in $nodes; do
    node_count=$((node_count + 1))

    # Check reference source
    if [ ! -f "$skill_dir/reference/src/$node.ts" ]; then
      echo "  MISSING: reference/src/$node.ts"
      ERRORS=$((ERRORS + 1))
    fi

    # Check reference test
    if [ ! -f "$skill_dir/reference/src/$node.test.ts" ]; then
      echo "  MISSING: reference/src/$node.test.ts"
      ERRORS=$((ERRORS + 1))
    fi

    # Check spec
    if [ ! -f "$skill_dir/nodes/$node/spec.md" ]; then
      echo "  MISSING: nodes/$node/spec.md"
      ERRORS=$((ERRORS + 1))
    fi

    # Check translation hints
    for lang in python rust go; do
      if [ ! -f "$skill_dir/nodes/$node/to-$lang.md" ]; then
        echo "  MISSING: nodes/$node/to-$lang.md"
        ERRORS=$((ERRORS + 1))
      fi
    done
  done

  echo "  $node_count nodes checked"
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS missing file(s)"
  exit 1
else
  echo ""
  echo "OK: all skills complete"
fi
