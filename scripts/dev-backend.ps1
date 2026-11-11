# Start FastAPI Backend Server
Write-Host "Starting Parivestra AI Tutor FastAPI backend on http://localhost:8001..." -ForegroundColor Cyan
uvicorn api:app --reload --port 8001

