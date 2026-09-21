#!/usr/bin/env bash

echo "=============================================="
echo "   Starting TraceLens NPA Frontend Server    "
echo "=============================================="

# --------------------------------------------------
# Project root
# --------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT/frontend" || {
    echo "[ERROR] Frontend directory not found."
    exit 1
}

# --------------------------------------------------
# Check package.json
# --------------------------------------------------

if [[ ! -f "package.json" ]]; then
    echo "[ERROR] package.json was not found."
    echo "Expected: $PROJECT_ROOT/frontend/package.json"
    exit 1
fi

# --------------------------------------------------
# Check npm
# --------------------------------------------------

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm was not found."
    echo "Please install Node.js and npm."
    exit 1
fi

echo
echo "[INFO] Frontend directory:"
echo "       $(pwd)"
echo

echo "[INFO] Starting frontend..."
echo "[INFO] Vite development server will start shortly."
echo

# --------------------------------------------------
# Start Vite
# --------------------------------------------------

exec npm run dev
