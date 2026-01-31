#!/usr/bin/env bash
# setup-env.sh — Install missing toolchains for Type-O translation experiments.
# Intended for Claude Code Web sessions (SessionStart hook) or manual use.
# Skips anything already installed. Safe to re-run.

set -euo pipefail

echo "=== Type-O environment setup ==="

# --- .NET SDK ---
if command -v dotnet &>/dev/null; then
  echo "[ok] dotnet $(dotnet --version)"
else
  echo "[install] .NET SDK..."
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  chmod +x /tmp/dotnet-install.sh
  /tmp/dotnet-install.sh --channel 8.0 --install-dir "$HOME/.dotnet"
  export DOTNET_ROOT="$HOME/.dotnet"
  export PATH="$DOTNET_ROOT:$PATH"
  # Persist for future shells
  echo 'export DOTNET_ROOT="$HOME/.dotnet"' >> "$HOME/.bashrc"
  echo 'export PATH="$DOTNET_ROOT:$PATH"' >> "$HOME/.bashrc"
  echo "[ok] dotnet $(dotnet --version)"
fi

# --- Swift (Linux) ---
if command -v swift &>/dev/null; then
  echo "[ok] swift $(swift --version 2>&1 | head -1)"
else
  echo "[install] Swift toolchain..."
  # Detect architecture
  ARCH=$(uname -m)
  SWIFT_VERSION="6.0.3"
  SWIFT_RELEASE="swift-${SWIFT_VERSION}-RELEASE"

  if [ "$ARCH" = "x86_64" ]; then
    SWIFT_PLATFORM="ubuntu2204"
    SWIFT_FILE="${SWIFT_RELEASE}-ubuntu22.04"
  elif [ "$ARCH" = "aarch64" ]; then
    SWIFT_PLATFORM="ubuntu2204-aarch64"
    SWIFT_FILE="${SWIFT_RELEASE}-ubuntu22.04-aarch64"
  else
    echo "[skip] Swift: unsupported architecture $ARCH"
    SWIFT_FILE=""
  fi

  if [ -n "${SWIFT_FILE:-}" ]; then
    SWIFT_URL="https://download.swift.org/${SWIFT_RELEASE,,}/${SWIFT_PLATFORM}/${SWIFT_RELEASE}/${SWIFT_FILE}.tar.gz"
    curl -fsSL "$SWIFT_URL" -o /tmp/swift.tar.gz 2>/dev/null && {
      mkdir -p "$HOME/.swift"
      tar xzf /tmp/swift.tar.gz --strip-components=2 -C "$HOME/.swift"
      rm /tmp/swift.tar.gz
      export PATH="$HOME/.swift/bin:$PATH"
      echo 'export PATH="$HOME/.swift/bin:$PATH"' >> "$HOME/.bashrc"
      echo "[ok] swift $(swift --version 2>&1 | head -1)"
    } || {
      echo "[skip] Swift: download failed (may not be available in this environment)"
    }
  fi
fi

# --- Verify pre-installed toolchains ---
for cmd in bun python3 go cargo; do
  if command -v "$cmd" &>/dev/null; then
    echo "[ok] $cmd available"
  else
    echo "[MISSING] $cmd — expected to be pre-installed"
  fi
done

# --- Install pytest for Python experiments ---
if python3 -c "import pytest" 2>/dev/null; then
  echo "[ok] pytest available"
else
  echo "[install] pytest..."
  pip3 install pytest --quiet 2>/dev/null || pip install pytest --quiet 2>/dev/null
  echo "[ok] pytest installed"
fi

echo "=== Setup complete ==="
