#!/usr/bin/env bash

echo "=============================================="
echo "   Launching TraceLens Network Analyzer       "
echo "=============================================="

# --------------------------------------------------
# Project root
# --------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR" || {
    echo "[ERROR] Could not access project root."
    exit 1
}

# --------------------------------------------------
# Check scripts
# --------------------------------------------------

if [[ ! -x "$ROOT_DIR/scripts/linux/start_backend.sh" ]]; then
    echo "[ERROR] start_backend.sh not found or not executable."
    echo
    echo "Run:"
    echo "    chmod +x scripts/linux/start_backend.sh"
    exit 1
fi

if [[ ! -x "$ROOT_DIR/scripts/linux/start_frontend.sh" ]]; then
    echo "[ERROR] start_frontend.sh not found or not executable."
    echo
    echo "Run:"
    echo "    chmod +x scripts/linux/start_frontend.sh"
    exit 1
fi

# --------------------------------------------------
# Launch Backend
# --------------------------------------------------

echo
echo "[INFO] Starting backend..."

"$ROOT_DIR/scripts/linux/start_backend.sh" > "$ROOT_DIR/backend.log" 2>&1 &

BACKEND_PID=$!

echo "[INFO] Backend PID: $BACKEND_PID"

# --------------------------------------------------
# Wait for backend
# --------------------------------------------------

echo "[INFO] Waiting 2 seconds for backend..."
sleep 2

# --------------------------------------------------
# Launch Frontend
# --------------------------------------------------

echo "[INFO] Starting frontend..."

"$ROOT_DIR/scripts/linux/start_frontend.sh" > "$ROOT_DIR/frontend.log" 2>&1 &

FRONTEND_PID=$!

echo "[INFO] Frontend PID: $FRONTEND_PID"

# --------------------------------------------------
# Wait for frontend
# --------------------------------------------------

echo "[INFO] Waiting 2 seconds for frontend..."
sleep 2

# --------------------------------------------------
# Open Browser
# --------------------------------------------------

echo "[INFO] Opening TraceLens NPA..."

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173" >/dev/null 2>&1 &
elif command -v gio >/dev/null 2>&1; then
    gio open "http://localhost:5173" >/dev/null 2>&1 &
else
    echo "[WARNING] Could not automatically open the browser."
    echo "Open manually: http://localhost:5173"
fi

# --------------------------------------------------
# Complete
# --------------------------------------------------

echo
echo "=============================================="
echo "       TraceLens NPA launched successfully!  "
echo "=============================================="
echo
echo "Backend API:  http://127.0.0.1:8000"
echo "Frontend UI:  http://localhost:5173"
echo
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo
echo "Logs:"
echo "  Backend:  $ROOT_DIR/backend.log"
echo "  Frontend: $ROOT_DIR/frontend.log"
echo
