#!/usr/bin/env bash

set -u

echo "=================================================="
echo "              TraceLens NPA Setup                 "
echo "=================================================="
echo

# --------------------------------------------------
# PROJECT ROOT
# --------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_PATH="$PROJECT_ROOT/frontend"

cd "$PROJECT_ROOT" || exit 1

echo "[INFO] Project root:"
echo "       $PROJECT_ROOT"
echo

# --------------------------------------------------
# CHECK FRONTEND DIRECTORY
# --------------------------------------------------

if [[ ! -d "$FRONTEND_PATH" ]]; then
    echo "[ERROR] Frontend directory was not found."
    echo
    echo "Expected:"
    echo "       $FRONTEND_PATH"
    echo
    exit 1
fi

# ==================================================
# PYTHON
# ==================================================

echo "----------------------------------------------"
echo "Checking Python"
echo "----------------------------------------------"
echo

if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] Python 3 was not found."
    echo
    echo "TraceLens NPA requires Python 3.11 or newer."
    echo
    echo "Install Python using your Linux distribution's package manager."
    echo
    exit 1
fi

PYTHON_COMMAND="$(command -v python3)"

echo "[INFO] Python command:"
echo "       $PYTHON_COMMAND"
echo

PYTHON_VERSION_OUTPUT="$(python3 --version 2>&1)"

if [[ $? -ne 0 ]]; then
    echo "[ERROR] Python command exists, but Python could not be executed."
    echo
    exit 1
fi

echo "[OK] $PYTHON_VERSION_OUTPUT"

# --------------------------------------------------
# PYTHON VERSION
# --------------------------------------------------

PYTHON_MAJOR="$(python3 -c 'import sys; print(sys.version_info.major)')"
PYTHON_MINOR="$(python3 -c 'import sys; print(sys.version_info.minor)')"

if [[ -z "$PYTHON_MAJOR" || -z "$PYTHON_MINOR" ]]; then
    echo "[ERROR] Could not determine Python version."
    exit 1
fi

if (( PYTHON_MAJOR < 3 || (PYTHON_MAJOR == 3 && PYTHON_MINOR < 11) )); then
    echo "[ERROR] Python 3.11 or newer is required."
    echo "Detected: Python $PYTHON_MAJOR.$PYTHON_MINOR"
    exit 1
fi

echo "[OK] Python version is supported."
echo

# ==================================================
# PYTHON VIRTUAL ENVIRONMENT
# ==================================================

echo "----------------------------------------------"
echo "Setting up Python virtual environment"
echo "----------------------------------------------"
echo

VENV_PATH="$PROJECT_ROOT/.venv"
PYTHON="$VENV_PATH/bin/python"

if [[ ! -d "$VENV_PATH" ]]; then

    echo "[INFO] Creating Python virtual environment..."
    echo

    python3 -m venv "$VENV_PATH"

    if [[ $? -ne 0 ]]; then
        echo
        echo "[ERROR] Failed to create Python virtual environment."
        echo
        echo "Possible causes:"
        echo "  - Python installation is incomplete"
        echo "  - python3-venv package is missing"
        echo "  - Permission problems"
        echo "  - Corrupted Python installation"
        echo
        exit 1
    fi

    echo "[OK] Virtual environment created."

else

    echo "[OK] Virtual environment already exists."

fi

if [[ ! -x "$PYTHON" ]]; then
    echo
    echo "[ERROR] Virtual environment Python was not found."
    echo
    echo "Expected:"
    echo "       $PYTHON"
    echo
    exit 1
fi

echo "[OK] Virtual environment Python found."
echo

# ==================================================
# PYTHON DEPENDENCIES
# ==================================================

echo "----------------------------------------------"
echo "Installing Python dependencies"
echo "----------------------------------------------"
echo

REQUIREMENTS_FILE="$PROJECT_ROOT/requirements.txt"

if [[ ! -f "$REQUIREMENTS_FILE" ]]; then
    echo "[ERROR] requirements.txt was not found."
    echo
    echo "Expected:"
    echo "       $REQUIREMENTS_FILE"
    echo
    exit 1
fi

echo "[INFO] Upgrading pip..."
echo

"$PYTHON" -m pip install --upgrade pip

if [[ $? -ne 0 ]]; then
    echo
    echo "[ERROR] Failed to upgrade pip."
    echo
    exit 1
fi

echo
echo "[INFO] Installing Python packages..."
echo "[INFO] This may take several minutes."
echo

"$PYTHON" -m pip install -r "$REQUIREMENTS_FILE"

if [[ $? -ne 0 ]]; then
    echo
    echo "[ERROR] Failed to install Python dependencies."
    echo
    echo "Check your internet connection and requirements.txt."
    echo
    exit 1
fi

echo
echo "[OK] Python dependencies installed."
echo

# ==================================================
# NODE.JS
# ==================================================

echo "----------------------------------------------"
echo "Checking Node.js"
echo "----------------------------------------------"
echo

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js was not found."
    echo
    echo "TraceLens NPA requires Node.js and npm."
    echo
    echo "Install Node.js using your Linux distribution's package manager"
    echo "or from the official Node.js website."
    echo
    exit 1
fi

NODE_VERSION="$(node --version 2>&1)"

if [[ $? -ne 0 ]]; then
    echo "[ERROR] Node.js was found but could not be executed."
    echo
    exit 1
fi

echo "[OK] Node.js $NODE_VERSION"

# --------------------------------------------------
# NPM
# --------------------------------------------------

if ! command -v npm >/dev/null 2>&1; then
    echo
    echo "[ERROR] npm was not found."
    echo "Node.js installation may be incomplete."
    echo
    exit 1
fi

NPM_VERSION="$(npm --version 2>&1)"

if [[ $? -ne 0 ]]; then
    echo
    echo "[ERROR] npm was found but could not be executed."
    echo
    exit 1
fi

echo "[OK] npm $NPM_VERSION"
echo

# ==================================================
# FRONTEND DEPENDENCIES
# ==================================================

echo "----------------------------------------------"
echo "Installing frontend dependencies"
echo "----------------------------------------------"
echo

cd "$FRONTEND_PATH" || exit 1

if [[ ! -f "package.json" ]]; then
    echo "[ERROR] package.json was not found."
    echo
    echo "Expected:"
    echo "       $FRONTEND_PATH/package.json"
    echo
    exit 1
fi

if [[ -f "package-lock.json" ]]; then

    echo "[INFO] package-lock.json found."
    echo "[INFO] Running npm ci..."
    echo

    npm ci

else

    echo "[WARNING] package-lock.json was not found."
    echo "[INFO] Running npm install instead..."
    echo

    npm install

fi

if [[ $? -ne 0 ]]; then
    echo
    echo "[ERROR] Failed to install frontend dependencies."
    echo
    echo "Check package.json and your internet connection."
    echo
    exit 1
fi

echo
echo "[OK] Frontend dependencies installed."
echo

# ==================================================
# PACKET CAPTURE
# ==================================================

echo "----------------------------------------------"
echo "Checking packet capture support"
echo "----------------------------------------------"
echo

if command -v dumpcap >/dev/null 2>&1; then

    DUMPCAP_VERSION="$(dumpcap --version 2>&1 | head -n 1)"

    echo "[OK] dumpcap detected."
    echo "     $DUMPCAP_VERSION"

elif command -v tcpdump >/dev/null 2>&1; then

    echo "[OK] tcpdump detected."
    echo "     Live packet capture is available."

else

    echo "[WARNING] No packet capture tool was detected."
    echo
    echo "TraceLens NPA live capture requires libpcap support."
    echo
    echo "Recommended:"
    echo "  Install Wireshark/dumpcap or tcpdump."
    echo
    echo "Examples:"
    echo "  Ubuntu/Debian:"
    echo "      sudo apt install wireshark"
    echo "  Fedora:"
    echo "      sudo dnf install wireshark"
    echo "  Arch:"
    echo "      sudo pacman -S wireshark-qt"
    echo

fi

echo

# ==================================================
# COMPLETE
# ==================================================

cd "$PROJECT_ROOT" || exit 1

echo "=================================================="
echo "             TraceLens NPA Setup Complete         "
echo "=================================================="
echo

echo "[OK] Python environment ready."
echo "[OK] Python dependencies ready."
echo "[OK] Frontend dependencies ready."

if command -v dumpcap >/dev/null 2>&1; then
    echo "[OK] dumpcap detected."
elif command -v tcpdump >/dev/null 2>&1; then
    echo "[OK] tcpdump detected."
else
    echo "[WARNING] Packet capture tool still needs to be installed."
fi

echo
echo "Setup is complete."
echo
echo "To start TraceLens NPA:"
echo
echo "    ./scripts/linux/start_all.sh"
echo
