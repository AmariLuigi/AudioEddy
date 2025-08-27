# AudioEddy Development Server Startup Script
# This script starts both frontend and backend servers

Write-Host "Starting AudioEddy Development Servers..." -ForegroundColor Green

# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'Z:\PROJECTS\AudioEddy\backend'; if (Test-Path 'venv') { .\venv\Scripts\Activate.ps1 } else { python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt }; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'Z:\PROJECTS\AudioEddy\frontend'; npx expo start --web --port 3000"

Write-Host "Development servers are starting..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")