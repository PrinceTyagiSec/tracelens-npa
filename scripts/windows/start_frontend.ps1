# TraceLens NPA - Start Frontend Server

Write-Host "==============================================" -ForegroundColor Green
Write-Host "   Starting TraceLens NPA Frontend Server    " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# --------------------------------------------------
# Project root
# --------------------------------------------------

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$FrontendPath = Join-Path $ProjectRoot "frontend"

Set-Location -Path $FrontendPath

# --------------------------------------------------
# Start Vite
# --------------------------------------------------

npm run dev