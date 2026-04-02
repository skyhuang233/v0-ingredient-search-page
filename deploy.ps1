# ==============================================================
# NutriGenius 一键部署脚本 (Windows PowerShell 兼容版)
# ==============================================================

$ErrorActionPreference = "Stop"

# ---- 颜色输出辅助函数 ----
function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "===============================================" -ForegroundColor Magenta
Write-Host "   NutriGenius Deployment Script (Windows)     " -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# ---- Step 1: 检查 Docker ----
Write-Step "Checking Docker Status..."
try {
    & docker info *>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Docker is not running. Please start Docker Desktop." }
    Write-OK "Docker is running."
} catch {
    Write-Fail "Docker command not found. Please install Docker Desktop."
}

# ---- Step 1b: 检查 GPU 支持 ----
Write-Step "Checking NVIDIA GPU Support..."
try {
    $gpuCheck = & docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "NVIDIA GPU detected. Using GPU acceleration."
    } else {
        Write-Warn "GPU check failed. Will continue but may fallback to CPU."
        Write-Warn "Install NVIDIA Container Toolkit for GPU support."
    }
} catch {
    Write-Warn "Could not verify GPU. Continuing..."
}

# ---- Step 2: 检查 .env.local ----
Write-Step "Checking .env.local..."
if (-not (Test-Path ".env.local")) {
    Write-Warn ".env.local not found. Copying from .env.example..."
    Copy-Item ".env.example" ".env.local"
    Write-Fail "Please fill in .env.local with your keys, then run again."
}
Write-OK ".env.local exists."

# ---- Step 3: 解析 .env.local ----
Write-Step "Parsing environment variables..."
$envVars = @{}
Get-Content ".env.local" | ForEach-Object {
    $trimmed = $_.Trim()
    if ($trimmed -and -not $trimmed.StartsWith("#") -and $trimmed.Contains("=")) {
        $parts = $trimmed.Split("=", 2)
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            $envVars[$key] = $val
        }
    }
}

# 验证 MODEL_DIR
$modelDir = $envVars["MODEL_DIR"]
if (-not $modelDir -or $modelDir -match "your/models/path") {
    Write-Fail "Please set MODEL_DIR in .env.local (e.g., MODEL_DIR=D:/models)"
}

# 验证目录
$modelDirLocal = $modelDir.Replace("/", "\")
if (-not (Test-Path $modelDirLocal)) {
    Write-Fail "MODEL_DIR directory does not exist: $modelDirLocal"
}

$modelPath = Join-Path $modelDirLocal "Qwen3-Embedding-0.6B"
if (-not (Test-Path $modelPath)) {
    Write-Warn "Qwen3-Embedding-0.6B not found in $modelDirLocal"
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne "y") { exit 1 }
} else {
    Write-OK "Model directory verified."
}

# 验证 API Key
if (-not $envVars["GOOGLE_API_KEY"] -or $envVars["GOOGLE_API_KEY"] -match "your_gemini_api_key") {
    Write-Fail "GOOGLE_API_KEY is missing in .env.local"
}
Write-OK "API Keys verified."

# ---- Step 4: 检查 Data ----
Write-Step "Checking Data Files..."
$missing = @()
@(
    "data\embeddings_0p6b\faiss_index.bin",
    "data\processed\recipes_clean.parquet"
) | ForEach-Object {
    if (-not (Test-Path $_)) { $missing += $_ }
}
if ($missing.Count -gt 0) {
    Write-Fail "Missing data files: $($missing -join ', ')"
}
Write-OK "Data files verified."

# ---- Step 5: 启动服务 ----
Write-Step "Starting Docker Services (This may take a while)..."
$env:MODEL_DIR = $modelDir
& docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose up failed."
}
Write-OK "Containers started. Waiting for initialization..."

# ---- Step 6: 健康检查 ----
Write-Step "Waiting for backend health check (2-5 mins)..."
$ready = $false
for ($i=1; $i -le 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 2>$null
        if ($resp.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch { }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 10
}

if ($ready) {
    Write-OK "`nBackend is READY!"
} else {
    Write-Warn "`nBackend timeout. Check 'docker compose logs backend'."
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Deployment Complete!                        " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  URL: http://localhost:3000"
Write-Host ""
