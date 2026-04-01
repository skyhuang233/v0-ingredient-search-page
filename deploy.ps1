# ==============================================================
# NutriGenius 一键部署脚本 (Windows PowerShell)
# 使用方法：在项目根目录下执行 .\deploy.ps1
# ==============================================================

$ErrorActionPreference = "Stop"

# ---- 颜色输出辅助函数 ----
function Write-Step { param($msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "===============================================" -ForegroundColor Magenta
Write-Host "   NutriGenius 一键部署脚本 (Windows)        " -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# ---- Step 1: 检查 Docker ----
Write-Step "检查 Docker 运行状态..."
try {
    docker info *>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Docker 未运行，请先启动 Docker Desktop" }
    Write-OK "Docker 正在运行"
} catch {
    Write-Fail "找不到 docker 命令，请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

# ---- Step 1b: 检查 NVIDIA GPU 支持 ----
Write-Step "检查 NVIDIA GPU 支持..."
try {
    $gpuCheck = docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-OK "NVIDIA GPU 可用，将使用 GPU 加速模式"
    } else {
        Write-Warn "GPU 检测失败（可能未安装 NVIDIA Container Toolkit）"
        Write-Warn "  将继续使用 GPU 镜像，但推理可能回退到 CPU"
        Write-Warn "  安装指南：https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    }
} catch {
    Write-Warn "无法验证 GPU 可用性，继续部署（如无 GPU 请在 docker-compose.yml 中切换为 CPU 模式）"
}

# ---- Step 2: 检查 .env.local ----
Write-Step "检查 .env.local 配置文件..."
if (-not (Test-Path ".env.local")) {
    Write-Warn ".env.local 不存在，正在从 .env.example 复制..."
    Copy-Item ".env.example" ".env.local"
    Write-Fail "已创建 .env.local，请先填入你的 API Key 和 MODEL_DIR，然后重新运行此脚本"
}
Write-OK ".env.local 存在"

# ---- Step 3: 解析并验证 .env.local ----
Write-Step "解析环境变量..."
$envVars = @{}
Get-Content ".env.local" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

# 检查 MODEL_DIR
$modelDir = $envVars["MODEL_DIR"]
if (-not $modelDir -or $modelDir -eq "/path/to/your/models/parent/directory") {
    Write-Fail "请在 .env.local 中设置 MODEL_DIR（Qwen3 模型所在的父目录路径）`n  示例：MODEL_DIR=D:/models"
}

# 路径格式修正（Windows 路径转换）
$modelDirLocal = $modelDir.Replace("/", "\")
if (-not (Test-Path $modelDirLocal)) {
    Write-Fail "MODEL_DIR 指定的目录不存在：$modelDirLocal`n  请确保模型文件已下载到该路径"
}

$modelPath = Join-Path $modelDirLocal "Qwen3-Embedding-0.6B"
if (-not (Test-Path $modelPath)) {
    Write-Warn "注意：在 $modelDirLocal 下未找到 Qwen3-Embedding-0.6B 子目录"
    Write-Warn "  确保目录结构为：$modelDirLocal\Qwen3-Embedding-0.6B\"
    $confirm = Read-Host "  是否仍然继续？(y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") { exit 1 }
} else {
    Write-OK "模型目录存在：$modelPath"
}

# 检查 GOOGLE_API_KEY
$apiKey = $envVars["GOOGLE_API_KEY"]
if (-not $apiKey -or $apiKey -eq "your_gemini_api_key_here") {
    Write-Fail "请在 .env.local 中设置 GOOGLE_API_KEY（Gemini API Key）`n  申请地址：https://aistudio.google.com/app/apikey"
}
Write-OK "GOOGLE_API_KEY 已配置"

# 检查 Supabase
$supabaseUrl = $envVars["NEXT_PUBLIC_SUPABASE_URL"]
if (-not $supabaseUrl -or $supabaseUrl -eq "https://your-project-id.supabase.co") {
    Write-Warn "NEXT_PUBLIC_SUPABASE_URL 未配置，部分收藏/历史功能可能不可用"
} else {
    Write-OK "Supabase 已配置"
}

# ---- Step 4: 检查数据目录 ----
Write-Step "检查预处理数据目录..."
$requiredFiles = @(
    "data\embeddings_0p6b\faiss_index.bin",
    "data\embeddings_0p6b\recipe_ids.npy",
    "data\processed\recipes_clean.parquet"
)
$missingFiles = @()
foreach ($f in $requiredFiles) {
    if (-not (Test-Path $f)) { $missingFiles += $f }
}
if ($missingFiles.Count -gt 0) {
    Write-Fail "以下数据文件缺失，请联系项目维护者获取并放置到对应路径：`n  $($missingFiles -join "`n  ")"
}
Write-OK "所有必要数据文件存在"

# ---- Step 5: 设置环境变量供 compose 使用 ----
$env:MODEL_DIR = $modelDir

# ---- Step 6: 构建并启动服务 ----
Write-Step "构建并启动 Docker 服务（首次构建 GPU 模式约需 20-40 分钟，含下载 CUDA 基础镜像 + PyTorch）..."
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose up 失败，请查看上方日志"
}
Write-OK "容器已启动，正在等待后端初始化..."

# ---- Step 7: 等待 backend 健康检查 ----
Write-Step "等待后端服务就绪（模型加载可能需要 2-5 分钟）..."
$maxRetries = 30
$retryInterval = 10
$retries = 0
while ($retries -lt $maxRetries) {
    Start-Sleep -Seconds $retryInterval
    $retries++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5 -UseBasicParsing 2>$null
        if ($response.StatusCode -eq 200) {
            Write-OK "后端服务已就绪！"
            break
        }
    } catch {
        Write-Host "  等待中... ($retries/$maxRetries)" -ForegroundColor DarkGray
    }
    if ($retries -ge $maxRetries) {
        Write-Warn "后端超时未响应，请运行 'docker compose logs backend' 查看日志"
    }
}

# ---- 完成 ----
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   部署完成！                                 " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  前端访问地址：" -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "  后端 API 地址：" -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "  健康检查：    " -NoNewline; Write-Host "http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  停止服务：    docker compose down"
Write-Host "  查看日志：    docker compose logs -f"
Write-Host "  重新部署：    .\deploy.ps1"
Write-Host ""
