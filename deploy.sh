#!/usr/bin/env bash
# ==============================================================
# NutriGenius 一键部署脚本 (Linux / macOS)
# 使用方法：chmod +x deploy.sh && ./deploy.sh
# ==============================================================

set -euo pipefail

# ---- 颜色输出 ----
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}[STEP]${NC} $1"; }
ok()    { echo -e "  ${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "  ${RED}[FAIL]${NC} $1"; exit 1; }

echo -e "\n${MAGENTA}===============================================${NC}"
echo -e "${MAGENTA}   NutriGenius 一键部署脚本 (Linux/macOS)    ${NC}"
echo -e "${MAGENTA}===============================================${NC}"

# ---- Step 1: 检查 Docker ----
step "检查 Docker 运行状态..."
if ! command -v docker &>/dev/null; then
    fail "找不到 docker 命令，请先安装 Docker：https://docs.docker.com/get-docker/"
fi
if ! docker info &>/dev/null; then
    fail "Docker 未运行，请先启动 Docker"
fi
ok "Docker 正在运行"

# ---- Step 1b: 检查 NVIDIA GPU 支持 ----
step "检查 NVIDIA GPU 支持..."
if docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi &>/dev/null; then
    ok "NVIDIA GPU 可用，将使用 GPU 加速模式"
else
    warn "GPU 检测失败（可能未安装 NVIDIA Container Toolkit）"
    warn "  将继续使用 GPU 镜像，但推理可能回退到 CPU"
    warn "  安装指南：https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
fi

# ---- Step 2: 检查 .env.local ----
step "检查 .env.local 配置文件..."
if [ ! -f ".env.local" ]; then
    warn ".env.local 不存在，正在从 .env.example 复制..."
    cp .env.example .env.local
    fail "已创建 .env.local，请先填入你的 API Key 和 MODEL_DIR，然后重新运行此脚本"
fi
ok ".env.local 存在"

# ---- Step 3: 解析并验证 .env.local ----
step "解析环境变量..."

# 读取 .env.local（跳过注释和空行）
set -a
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env.local | grep '=')
set +a

# 检查 MODEL_DIR
if [ -z "${MODEL_DIR:-}" ] || [ "$MODEL_DIR" = "/path/to/your/models/parent/directory" ]; then
    fail "请在 .env.local 中设置 MODEL_DIR（Qwen3 模型所在的父目录路径）\n  示例：MODEL_DIR=/home/yourname/models"
fi

if [ ! -d "$MODEL_DIR" ]; then
    fail "MODEL_DIR 指定的目录不存在：$MODEL_DIR\n  请确保模型文件已下载到该路径"
fi

MODEL_PATH="$MODEL_DIR/Qwen3-Embedding-0.6B"
if [ ! -d "$MODEL_PATH" ]; then
    warn "注意：在 $MODEL_DIR 下未找到 Qwen3-Embedding-0.6B 子目录"
    warn "  确保目录结构为：$MODEL_DIR/Qwen3-Embedding-0.6B/"
    read -rp "  是否仍然继续？(y/N) " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
else
    ok "模型目录存在：$MODEL_PATH"
fi

# 检查 GOOGLE_API_KEY
if [ -z "${GOOGLE_API_KEY:-}" ] || [ "$GOOGLE_API_KEY" = "your_gemini_api_key_here" ]; then
    fail "请在 .env.local 中设置 GOOGLE_API_KEY\n  申请地址：https://aistudio.google.com/app/apikey"
fi
ok "GOOGLE_API_KEY 已配置"

# 检查 Supabase
if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://your-project-id.supabase.co" ]; then
    warn "NEXT_PUBLIC_SUPABASE_URL 未配置，部分收藏/历史功能可能不可用"
else
    ok "Supabase 已配置"
fi

# ---- Step 4: 检查数据目录 ----
step "检查预处理数据目录..."
REQUIRED_FILES=(
    "data/embeddings_0p6b/faiss_index.bin"
    "data/embeddings_0p6b/recipe_ids.npy"
    "data/processed/recipes_clean.parquet"
)
MISSING=()
for f in "${REQUIRED_FILES[@]}"; do
    [ -f "$f" ] || MISSING+=("$f")
done
if [ ${#MISSING[@]} -gt 0 ]; then
    fail "以下数据文件缺失，请联系项目维护者获取并放置到对应路径：\n  $(printf '%s\n  ' "${MISSING[@]}")"
fi
ok "所有必要数据文件存在"

# ---- Step 5: 构建并启动服务 ----
step "构建并启动 Docker 服务（首次构建可能需要 10-20 分钟）..."
export MODEL_DIR
docker compose up --build -d
ok "容器已启动，正在等待后端初始化..."

# ---- Step 6: 等待 backend 健康检查 ----
step "等待后端服务就绪（模型加载可能需要 2-5 分钟）..."
MAX_RETRIES=30
RETRY_INTERVAL=10
RETRIES=0
while [ $RETRIES -lt $MAX_RETRIES ]; do
    sleep $RETRY_INTERVAL
    RETRIES=$((RETRIES + 1))
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        ok "后端服务已就绪！"
        break
    fi
    echo -e "  ${NC}等待中... ($RETRIES/$MAX_RETRIES)${NC}"
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        warn "后端超时未响应，请运行 'docker compose logs backend' 查看日志"
    fi
done

# ---- 完成 ----
echo -e "\n${GREEN}===============================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}===============================================${NC}\n"
echo -e "  前端访问地址：${CYAN}http://localhost:3000${NC}"
echo -e "  后端 API 地址：${CYAN}http://localhost:8000${NC}"
echo -e "  健康检查：    ${CYAN}http://localhost:8000/health${NC}\n"
echo    "  停止服务：    docker compose down"
echo    "  查看日志：    docker compose logs -f"
echo    "  重新部署：    ./deploy.sh"
echo ""
