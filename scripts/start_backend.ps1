# TraceLens NPA - Start Backend Server

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   Starting TraceLens NPA Backend Server     " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------
# Project root
# --------------------------------------------------

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $ProjectRoot

# --------------------------------------------------
# Python virtual environment
# --------------------------------------------------

$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {

    Write-Host "[ERROR] Python virtual environment was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected:" -ForegroundColor Yellow
    Write-Host $Python -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run setup first:" -ForegroundColor Yellow
    Write-Host "    .\scripts\setup.ps1" -ForegroundColor Cyan
    Write-Host ""

    exit 1
}

# --------------------------------------------------
# Check Uvicorn
# --------------------------------------------------

$UvicornCheck = & $Python -c "import uvicorn" 2>&1

if ($LASTEXITCODE -ne 0) {

    Write-Host "[ERROR] Uvicorn is not installed in the TraceLens virtual environment." -ForegroundColor Red
    Write-Host ""
    Write-Host "Run setup again:" -ForegroundColor Yellow
    Write-Host "    .\scripts\setup.ps1" -ForegroundColor Cyan
    Write-Host ""

    exit 1
}

# --------------------------------------------------
# Environment
# --------------------------------------------------

$env:PYTHONPATH = $ProjectRoot

Write-Host "[INFO] Python:" -ForegroundColor Cyan
Write-Host "       $Python"
Write-Host ""

Write-Host "[INFO] Starting backend..." -ForegroundColor Green
Write-Host "[INFO] Backend API: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host ""

# --------------------------------------------------
# Start FastAPI
# --------------------------------------------------

& $Python -m uvicorn backend.app.main:app `
    --host 127.0.0.1 `
    --port 8000 `
    --reload