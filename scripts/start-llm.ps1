# scripts/start-llm.ps1 - Start llama-server for Gemma 4 on Port 8000
param(
    [int]$Port = 8000,
    [int]$ContextSize = 4096,
    [int]$GpuLayers = -1
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PARIVESTRA AI TUTOR - LOCAL GEMMA 4 SERVER LAUNCHER" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Locate llama-server executable
$llamaPaths = @(
    "C:\Users\chind\.unsloth\llama.cpp\build\bin\Release\llama-server.exe",
    "C:\Users\chind\.unsloth\llama.cpp\llama-server.exe"
)

$llamaServer = $null
foreach ($p in $llamaPaths) {
    if (Test-Path $p) {
        $llamaServer = $p
        break
    }
}

if (-not $llamaServer) {
    $found = Get-Command "llama-server" -ErrorAction SilentlyContinue
    if ($found) { $llamaServer = $found.Source }
}

if (-not $llamaServer) {
    Write-Error "Could not find llama-server.exe. Please ensure Unsloth or llama.cpp is installed."
    exit 1
}

Write-Host "Found llama-server: $llamaServer" -ForegroundColor Green

# 2. Locate GGUF model file
$ggufCandidatePaths = @(
    "M:\HuggingFace\hub\models--unsloth--gemma-4-E2B-it-GGUF\snapshots\*\gemma-4-E2B-it-UD-Q4_K_XL.gguf",
    "C:\Users\chind\.cache\huggingface\hub\models--unsloth--gemma-4-E2B-it-GGUF\snapshots\*\*.gguf",
    "M:\HuggingFace\hub\models--unsloth--gemma-4-E2B-it-GGUF\*.gguf"
)

$ggufPath = $null
foreach ($pattern in $ggufCandidatePaths) {
    $matched = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($matched) {
        $ggufPath = $matched.FullName
        break
    }
}

if (-not $ggufPath) {
    Write-Host "Searching for gemma-4*.gguf on disk..." -ForegroundColor Yellow
    $matched = Get-ChildItem -Path "M:\HuggingFace", "C:\Users\chind\.cache" -Filter "*gemma-4*.gguf" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($matched) {
        $ggufPath = $matched.FullName
    }
}

if (-not $ggufPath) {
    Write-Error "Could not find Gemma 4 GGUF model file in HuggingFace cache or M: drive."
    exit 1
}

Write-Host "Found GGUF Model: $ggufPath" -ForegroundColor Green

# 3. Check if port is already active
$portActive = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portActive) {
    Write-Host "Port $Port is already in use by PID $($portActive[0].OwningProcess)." -ForegroundColor Yellow
    Write-Host "OpenAI-compatible endpoint is available at http://localhost:$Port/v1" -ForegroundColor Green
    exit 0
}

# 4. Launch llama-server
Write-Host "Starting llama-server on http://0.0.0.0:$Port/v1 (alias: gemma-4)..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate the server." -ForegroundColor Yellow

& $llamaServer -m "$ggufPath" --port $Port --alias "gemma-4" -c $ContextSize -ngl $GpuLayers --host 0.0.0.0

