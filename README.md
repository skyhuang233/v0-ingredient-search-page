# Bio-Adaptive Agentic RAG Smart Search 🥗

**A next-generation recipe search engine that adapts to your biology.**

![Project Banner](https://via.placeholder.com/1200x300?text=Bio-Adaptive+Agentic+Search)

## 📖 Overview

This project is a sophisticated search application that combines **FastAPI** (Backend), **Next.js** (Frontend), and **LLM Agents** to provide hyper-personalized recipe recommendations. It doesn't just find recipes with your ingredients; it understands *who you are*—your health goals, dietary restrictions, and fitness targets—and re-ranks results to serve your well-being.

### Key Features
*   **🧠 Agentic Reranking:** An intelligent agent analyzes search results against your health profile to surface the best options.
*   **⚡ Two-Stage RAG:** Blends fast vector retrieval (Faiss) with smart LLM reasoning.
*   **💬 Context-Aware Chat:** Integrated AI assistant that can discuss recipes and suggest modifications.
*   **🧬 Bio-Adaptive:** Recommendations change based on whether you want to "Build Muscle", "Lose Weight", or "Eat Clean".

## 🚀 Quick Start

To run the full system, you need to start both the Frontend and the Backend.

### 1. Start the Backend (Recommendation Engine)
Open a terminal in the project root:
```bash
# Activate your python environment (conda/venv)
uvicorn recommender.main:app --reload --port 8000
```
*Health Check:* Visit `http://localhost:8000/health` to verify it's running.

### 2. Start the Frontend (User Interface)
Open a **new** terminal window in the project root:
```bash
npm run dev
# or
pnpm dev
```
*Access App:* Visit **`http://localhost:3000`**.

## 📚 Documentation

We have detailed documentation available in the `docs/` directory:

*   **[System Design](docs/SYSTEM_DESIGN.md):** Deep dive into the Two-Stage RAG architecture, **Database Schema**, and component flows.
*   **[User Guide](docs/USER_GUIDE.md):** How to use the search features, chat assistant, and interpret results.
*   **[Deployment Guide](docs/DEPLOYMENT.md):** Production setup via Docker or VPS.

## 🛠️ Configuration

Create a `.env.local` file in the root directory if it doesn't exist:

```bash
# LLM Provider Key (Required for Reranking)
DEEPSEEK_API_KEY=your_key_here

# Backend URL
RECOMMENDER_URL=http://localhost:8000/recommend
```

## 🤝 Contributing

See the [System Design](docs/SYSTEM_DESIGN.md) doc for understand the code structure before making changes.

---

