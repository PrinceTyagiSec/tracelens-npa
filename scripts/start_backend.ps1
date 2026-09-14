# TraceLens NPA - Start Backend Server
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   Starting TraceLens NPA Backend Server     " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$env:PYTHONPATH = (Get-Item -Path ".").FullName
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
