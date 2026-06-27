Write-Host "Checking python environment..." -ForegroundColor Cyan
if (Test-Path -Path "venv") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    .\venv\Scripts\Activate.ps1
} else {
    Write-Host "No venv folder found. Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    .\venv\Scripts\Activate.ps1
    Write-Host "Installing dependencies..." -ForegroundColor Green
    pip install -r requirements.txt
}

Write-Host "Starting Nexus Cognitive Engine on http://localhost:8000 ..." -ForegroundColor Cyan
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
