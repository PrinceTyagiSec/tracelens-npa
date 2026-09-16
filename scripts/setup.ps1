# TraceLens NPA - Setup
# Installs and verifies backend and frontend dependencies

Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "              TraceLens NPA Setup                 " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

# --------------------------------------------------
# PROJECT ROOT
# --------------------------------------------------

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendPath = Join-Path $ProjectRoot "frontend"

Set-Location $ProjectRoot

Write-Host "[INFO] Project root:" -ForegroundColor Cyan
Write-Host "       $ProjectRoot"
Write-Host ""

# --------------------------------------------------
# CHECK FRONTEND DIRECTORY
# --------------------------------------------------

if (-not (Test-Path $FrontendPath)) {
    Write-Host "[ERROR] Frontend directory was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host $FrontendPath -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ==================================================
# PYTHON
# ==================================================

Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host "Checking Python" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$PythonCommand = Get-Command python -ErrorAction SilentlyContinue

if (-not $PythonCommand) {

    Write-Host "[ERROR] Python was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "TraceLens NPA requires Python 3.11 or newer." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install Python from:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "During installation, enable 'Add Python to PATH'." -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

Write-Host "[INFO] Python command:" -ForegroundColor Cyan
Write-Host "       $($PythonCommand.Source)"
Write-Host ""

$PythonVersionOutput = & python --version 2>&1

if ($LASTEXITCODE -ne 0) {

    Write-Host "[ERROR] Python command exists, but Python could not be executed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Detected command:" -ForegroundColor Yellow
    Write-Host $PythonCommand.Source
    Write-Host ""
    Write-Host "Windows may be redirecting 'python' to the Microsoft Store." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install a real Python installation from:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""

    exit 1
}

Write-Host "[OK] $PythonVersionOutput" -ForegroundColor Green

# --------------------------------------------------
# PYTHON VERSION
# --------------------------------------------------

$PythonMajor = & python -c "import sys; print(sys.version_info.major)"
$PythonMinor = & python -c "import sys; print(sys.version_info.minor)"

if ($LASTEXITCODE -ne 0) {

    Write-Host "[ERROR] Could not determine Python version." -ForegroundColor Red
    Write-Host ""

    exit 1
}

$PythonMajor = [int]$PythonMajor
$PythonMinor = [int]$PythonMinor

if (($PythonMajor -lt 3) -or (($PythonMajor -eq 3) -and ($PythonMinor -lt 11))) {

    Write-Host "[ERROR] Python 3.11 or newer is required." -ForegroundColor Red
    Write-Host "Detected: Python $PythonMajor.$PythonMinor" -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

Write-Host "[OK] Python version is supported." -ForegroundColor Green
Write-Host ""

# ==================================================
# PYTHON VIRTUAL ENVIRONMENT
# ==================================================

Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host "Setting up Python virtual environment" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$VenvPath = Join-Path $ProjectRoot ".venv"
$Python = Join-Path $VenvPath "Scripts\python.exe"

if (-not (Test-Path $VenvPath)) {

    Write-Host "[INFO] Creating Python virtual environment..." -ForegroundColor Yellow
    Write-Host ""

    & python -m venv $VenvPath

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "[ERROR] Failed to create Python virtual environment." -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible causes:" -ForegroundColor Yellow
        Write-Host "  - Python installation is incomplete"
        Write-Host "  - Python venv component is missing"
        Write-Host "  - Permission problems"
        Write-Host "  - Corrupted Python installation"
        Write-Host ""

        exit 1
    }

    Write-Host "[OK] Virtual environment created." -ForegroundColor Green
}
else {

    Write-Host "[OK] Virtual environment already exists." -ForegroundColor Green
}

if (-not (Test-Path $Python)) {

    Write-Host ""
    Write-Host "[ERROR] Virtual environment Python was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host $Python -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

Write-Host "[OK] Virtual environment Python found." -ForegroundColor Green
Write-Host ""

# ==================================================
# PYTHON DEPENDENCIES
# ==================================================

Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host "Installing Python dependencies" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$RequirementsFile = Join-Path $ProjectRoot "requirements.txt"

if (-not (Test-Path $RequirementsFile)) {

    Write-Host "[ERROR] requirements.txt was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host $RequirementsFile -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

Write-Host "[INFO] Upgrading pip..." -ForegroundColor Yellow
Write-Host ""

& $Python -m pip install --upgrade pip

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "[ERROR] Failed to upgrade pip." -ForegroundColor Red
    Write-Host ""

    exit 1
}

Write-Host ""
Write-Host "[INFO] Installing Python packages..." -ForegroundColor Yellow
Write-Host "[INFO] This may take several minutes." -ForegroundColor Yellow
Write-Host ""

& $Python -m pip install -r $RequirementsFile

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "[ERROR] Failed to install Python dependencies." -ForegroundColor Red
    Write-Host ""
    Write-Host "Check your internet connection and requirements.txt." -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

Write-Host ""
Write-Host "[OK] Python dependencies installed." -ForegroundColor Green
Write-Host ""

# ==================================================
# NODE.JS
# ==================================================

Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host "Checking Node.js" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $NodeCommand) {

    Write-Host "[ERROR] Node.js was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "TraceLens NPA requires Node.js and npm." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install Node.js from:" -ForegroundColor Yellow
    Write-Host "https://nodejs.org/" -ForegroundColor Cyan
    Write-Host ""

    exit 1
}

$NodeVersion = & node --version 2>&1

if ($LASTEXITCODE -ne 0) {

    Write-Host "[ERROR] Node.js was found but could not be executed." -ForegroundColor Red
    Write-Host ""

    exit 1
}

Write-Host "[OK] Node.js $NodeVersion" -ForegroundColor Green

# --------------------------------------------------
# NPM
# --------------------------------------------------

$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue

if (-not $NpmCommand) {

    Write-Host ""
    Write-Host "[ERROR] npm was not found." -ForegroundColor Red
    Write-Host "Node.js installation may be incomplete." -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

$NpmVersion = & npm --version 2>&1

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "[ERROR] npm was found but could not be executed." -ForegroundColor Red
    Write-Host ""

    exit 1
}

Write-Host "[OK] npm $NpmVersion" -ForegroundColor Green
Write-Host ""

# ==================================================
# FRONTEND DEPENDENCIES
# ==================================================

Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host "Installing frontend dependencies" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host ""

Set-Location $FrontendPath

if (-not (Test-Path "package.json")) {

    Write-Host "[ERROR] package.json was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host (Join-Path $FrontendPath "package.json") -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

if (Test-Path "package-lock.json") {

    Write-Host "[INFO] package-lock.json found." -ForegroundColor Green
    Write-Host "[INFO] Running npm ci..." -ForegroundColor Yellow
    Write-Host ""

    npm ci
}
else {

    Write-Host "[WARNING] package-lock.json was not found." -ForegroundColor Yellow
    Write-Host "[INFO] Running npm install instead..." -ForegroundColor Yellow
    Write-Host ""

    npm install
}

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "[ERROR] Failed to install frontend dependencies." -ForegroundColor Red
    Write-Host ""
    Write-Host "Check package.json and your internet connection." -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

Write-Host ""
Write-Host "[OK] Frontend dependencies installed." -ForegroundColor Green
Write-Host ""

# ==================================================
# NPCAP
# ==================================================

Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host "Checking Npcap" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$NpcapPath = Join-Path $env:WINDIR "System32\Npcap"

if (Test-Path $NpcapPath) {

    Write-Host "[OK] Npcap detected." -ForegroundColor Green
}
else {

    Write-Host "[WARNING] Npcap was not detected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Npcap is required for live packet capture on Windows." -ForegroundColor Yellow
    Write-Host "Install Npcap before using live capture features." -ForegroundColor Yellow
}

Write-Host ""

# ==================================================
# COMPLETE
# ==================================================

Set-Location $ProjectRoot

Write-Host "==================================================" -ForegroundColor Green
Write-Host "             TraceLens NPA Setup Complete         " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

Write-Host "[OK] Python environment ready." -ForegroundColor Green
Write-Host "[OK] Python dependencies ready." -ForegroundColor Green
Write-Host "[OK] Frontend dependencies ready." -ForegroundColor Green

if (Test-Path $NpcapPath) {
    Write-Host "[OK] Npcap detected." -ForegroundColor Green
}
else {
    Write-Host "[WARNING] Npcap still needs to be installed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup is complete." -ForegroundColor Green
Write-Host ""
Write-Host "To start TraceLens NPA:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    .\scripts\start_all.ps1" -ForegroundColor White
Write-Host ""