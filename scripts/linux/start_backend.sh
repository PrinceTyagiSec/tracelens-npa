#!/usr/bin/env bash

echo "=============================================="
echo "   Starting TraceLens NPA Backend Server     "
echo "=============================================="
echo

# --------------------------------------------------
# Project root
# --------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

# --------------------------------------------------
# Python virtual environment
# --------------------------------------------------

PYTHON="$PROJECT_ROOT/.venv/bin/python"

if [[ ! -x "$PYTHON" ]]; then

    echo "[ERROR] Python virtual environment was not found."
    echo
    echo "Expected:"
    echo "    $PYTHON"
    echo
    echo "Run setup first:"
    echo "    ./scripts/linux/setup.sh"
    echo

    exit 1
fi

# --------------------------------------------------
# Check Uvicorn
# --------------------------------------------------

if ! "$PYTHON" -c "import uvicorn" >/dev/null 2>&1; then

    echo "[ERROR] Uvicorn is not installed in the TraceLens virtual environment."
    echo
    echo "Run setup again:"
    echo "    ./scripts/linux/setup.sh"
    echo

    exit 1
fi

# --------------------------------------------------
# Environment
# --------------------------------------------------

export PYTHONPATH="$PROJECT_ROOT"

echo "[INFO] Python:"
echo "       $PYTHON"
echo

echo "[INFO] Starting backend..."
echo "[INFO] Backend API: http://127.0.0.1:8000"
echo

# --------------------------------------------------
# Start FastAPI
# --------------------------------------------------

exec "$PYTHON" -m uvicorn backend.app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --reload
