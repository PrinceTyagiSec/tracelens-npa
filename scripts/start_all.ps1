# TraceLens NPA - Launch Full Application
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "   Launching TraceLens Network Analyzer       " -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow

$rootDir = Split-Path -Parent $PSScriptRoot

# Launch Backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; ./scripts/start_backend.ps1"

# Wait 2 seconds for backend to bind
Start-Sleep -Seconds 2

# Launch Frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; ./scripts/start_frontend.ps1"

# Wait 2 seconds and launch default browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host "TraceLens NPA launched successfully!" -ForegroundColor Green
Write-Host "Backend API:  http://127.0.0.1:8000"
Write-Host "Frontend UI:  http://localhost:5173"
