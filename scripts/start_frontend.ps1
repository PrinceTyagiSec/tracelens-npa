# TraceLens NPA - Start Frontend Server
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   Starting TraceLens NPA Frontend Server    " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

Set-Location -Path "frontend"
npm run dev
