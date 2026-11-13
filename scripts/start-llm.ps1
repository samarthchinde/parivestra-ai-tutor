# scripts/start-llm.ps1
# Starts llama-server for Gemma 4 on 127.0.0.1:8000 with reasoning suppressed.

$ErrorActionPreference = "Stop"

Write-Host "=== Starting Parivestra Local LLM Server ===" -ForegroundColor Cyan

# 1. Search for GGUF model file
$searchRoots = @(
    "M:\HuggingFace\hub",
    "$env:USERPROFILE\.cache\huggingface\hub",
    "$env:USERPROFILE\.unsloth",
    "M:\"
)

$ggufCandidate = $null
foreach ($root in $searchRoots) {
    if (Test-Path $root) {
        # First priority: gemma-4 UD-Q4_K_XL
        $found = Get-ChildItem -Path $root -Filter "*gemma-4*UD-Q4_K_XL*.gguf" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $found) {
            $found = Get-ChildItem -Path $root -Filter "*gemma-4*.gguf" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        }
        if (-not $found) {
            $found = Get-ChildItem -Path $root -Filter "*.gguf" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        }
        if ($found) {
            $ggufCandidate = $found.FullName
            break
        }
    }
}

if (-not $ggufCandidate -or -not (Test-Path $ggufCandidate)) {
    Write-Host "[ERROR] Could not find Gemma 4 GGUF file in cache locations." -ForegroundColor Red
    Write-Host "Searched locations: $($searchRoots -join ', ')" -ForegroundColor Yellow
    exit 1
}

Write-Host "[FOUND GGUF] $ggufCandidate" -ForegroundColor Green

# 2. Search for llama-server.exe
$serverCandidate = $null
$possibleServerPaths = @(
    "$env:USERPROFILE\.unsloth\llama.cpp\build\bin\Release\llama-server.exe",
    "$env:USERPROFILE\.unsloth\llama.cpp\build\bin\llama-server.exe",
    "C:\llama.cpp\llama-server.exe"
)

foreach ($p in $possibleServerPaths) {
    if (Test-Path $p) {
        $serverCandidate = $p
        break
    }
}

if (-not $serverCandidate) {
    $cmd = Get-Command "llama-server.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $serverCandidate = $cmd.Source
    }
}

if (-not $serverCandidate -or -not (Test-Path $serverCandidate)) {
    Write-Host "[ERROR] llama-server.exe not found." -ForegroundColor Red
    Write-Host "Checked paths: $($possibleServerPaths -join ', ')" -ForegroundColor Yellow
    exit 1
}

Write-Host "[FOUND SERVER] $serverCandidate" -ForegroundColor Green

# Ensure logs directory exists
$logDir = Join-Path $PSScriptRoot "..\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = Join-Path $logDir "llm.log"
$logErrFile = Join-Path $logDir "llm_err.log"

# Check if port 8000 is already responding
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/v1/models" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($res) {
        Write-Host "[INFO] LLM server is ALREADY running and responding on http://127.0.0.1:8000/v1." -ForegroundColor Green
        exit 0
    }
} catch {
    # Port not open yet or not responding, continue to launch
}

# 3. Launch llama-server with GPU offloading and reasoning disabled
# --reasoning off and chat template kwargs ensure Gemma 4 outputs direct answers
$serverArgs = @(
    "-m", "`"$ggufCandidate`"",
    "--host", "127.0.0.1",
    "--port", "8000",
    "-c", "4096",
    "--alias", "gemma-4",
    "-ngl", "-1",
    "--reasoning", "off",
    "--reasoning-budget", "0"
)

Write-Host "Starting llama-server on 127.0.0.1:8000 (logging to $logFile)..." -ForegroundColor Cyan

# Start process redirecting output to log files
$proc = Start-Process -FilePath $serverCandidate -ArgumentList ($serverArgs -join " ") -PassThru -WindowStyle Minimized -RedirectStandardOutput $logFile -RedirectStandardError $logErrFile

# 4. Wait until /v1/models responds
$maxAttempts = 30
$attempt = 0
$ready = $false

Write-Host "Waiting for /v1/models to become ready..." -NoNewline
while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempt++
    Write-Host "." -NoNewline
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/v1/models" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($res.data -or $res.models -or $res) {
            $ready = $true
            break
        }
    } catch {
        # Check if process died
        if ($proc.HasExited) {
            Write-Host "`n[ERROR] llama-server process terminated unexpectedly (ExitCode: $($proc.ExitCode))." -ForegroundColor Red
            if (Test-Path $logErrFile) {
                Write-Host "--- Last 20 lines of logs/llm_err.log ---" -ForegroundColor Yellow
                Get-Content $logErrFile -Tail 20
            }
            exit 1
        }
    }
}

Write-Host ""
if ($ready) {
    Write-Host "[SUCCESS] Local LLM server is UP and responding at http://127.0.0.1:8000/v1" -ForegroundColor Green
    Write-Host "Model alias: gemma-4 | Context: 4096 | Host: 127.0.0.1:8000" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Timeout waiting for http://127.0.0.1:8000/v1/models to respond." -ForegroundColor Red
    if (Test-Path $logErrFile) {
        Write-Host "--- Last 20 lines of logs/llm_err.log ---" -ForegroundColor Yellow
        Get-Content $logErrFile -Tail 20
    }
    exit 1
}
