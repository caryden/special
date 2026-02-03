#!/usr/bin/env bash
# Check that all internal markdown links resolve to existing files or anchors.
# External links (http/https) are skipped.
#
# Usage: ./scripts/check-links.sh [root-dir]

set -euo pipefail

ROOT="${1:-.}"
ERRORS=0

# Find all markdown files
while IFS= read -r md_file; do
  dir="$(dirname "$md_file")"

  # Extract markdown links: [text](target) — skip external URLs and anchors-only
  while IFS= read -r link; do
    # Skip external links
    case "$link" in
      http://*|https://*|mailto:*) continue ;;
    esac

    # Split off anchor fragment
    path_part="${link%%#*}"

    # Skip pure anchor links (#foo)
    if [ -z "$path_part" ]; then
      continue
    fi

    # Resolve relative to the markdown file's directory
    target="$dir/$path_part"

    if [ ! -e "$target" ]; then
      echo "BROKEN: $md_file -> $link"
      echo "  (resolved to $target)"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(sed -n 's/.*\](\([^)]*\)).*/\1/p' "$md_file")

done < <(find "$ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*')

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS broken link(s)"
  exit 1
else
  echo "OK: all internal links resolve"
fi
