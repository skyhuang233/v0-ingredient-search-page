# Deployment Guide

This guide outlines the steps to deploy the **Bio-Adaptive Agentic RAG Smart Search** application to a production environment.

## 1. Architecture Overview

The application consists of two main services that must run concurrently:
1.  **Frontend**: Next.js (Node.js) - Serves the UI and API routes.
2.  **Backend**: FastAPI (Python) - Handles heavy lifting (vector search, embeddings).

## 2. Prerequisites

*   **Server**: A Linux VPS (Ubuntu 22.04 LTS recommended) or a PaaS (Heroku/Render/Railway).
*   **Database**: Supabase (PostgreSQL) project.
*   **LLM API**: DeepSeek API Key.
*   **System Deps**: Node.js 18+, Python 3.10+, Standard build tools.

## 3. Environment Variables

Create a `.env.production` file (or set variables in your CI/CD settings):

```bash
# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DEEPSEEK_API_KEY=sk-prod-key
RECOMMENDER_URL=http://backend-service:8000/recommend

# Backend
# If running on the same machine without docker network, use localhost
# If using Docker, use the service name 'backend-service'
```

## 4. Deployment Strategies

### Option A: Docker Compose (Recommended)

Create a `docker-compose.yml` in the root:

```yaml
version: '3.8'

services:
  backend:
    build: 
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - RECIPES_PATH=data/processed/recipes_clean.parquet
      - FAISS_INDEX=data/embeddings_0p6b/faiss_index.bin
      - MODEL_DTYPE=float32
    volumes:
      - ./data:/app/data

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - RECOMMENDER_URL=http://backend:8000/recommend
```

### Option B: Manual Setup (Ubuntu VPS)

#### 1. Backend Setup
```bash
# Install dependencies
sudo apt update && sudo apt install python3.10-venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run with Gunicorn (Production Server)
pip install gunicorn
gunicorn recommender.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 2. Frontend Setup
```bash
# Build Next.js
npm ci
npm run build

# Start with PM2 (Process Manager)
npm install -g pm2
pm2 start npm --name "frontend" -- start
```

## 5. Database Migration

Ensure your Supabase project has the required tables.

Run the SQL found in `docs/SYSTEM_DESIGN.md` in your Supabase SQL Editor to create the `user_health_profiles` table.

## 6. Verification

1.  Access the frontend IP/Domain.
2.  Perform a search.
3.  Check backend logs to ensure vectors are loading correctly.
