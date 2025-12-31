# System Design Documentation

## 1. System Overview

**Bio-Adaptive Agentic RAG Smart Search** is an advanced recipe recommendation system that goes beyond simple keyword matching. It uses a **Two-Stage Retrieval-Augmented Generation (RAG)** architecture to provide personalized, health-conscious recipe suggestions.

### Core Architecture

The system operates in two main stages:

1.  **Stage 1: Broad Retrieval (Dense Retrieval)**
    *   **Objective:** Quickly identify potential recipe matches from a large dataset.
    *   **Technology:** Python, Faiss, Dense Embeddings.
    *   **Process:** User ingredients are converted into vector embeddings. The system queries a pre-computed Faiss index to retrieve the top-N (e.g., 20) most semantically similar recipes.

2.  **Stage 2: Agentic Reranking (Smart Filtering)**
    *   **Objective:** Refine the broad results based on the user's specific health profile and provide expert commentary.
    *   **Technology:** TypeScript (Next.js), LLM (DeepSeek/OpenAI), Prompt Engineering.
    *   **Process:**
        *   The system takes the Top-N recipes from Stage 1.
        *   It combines them with the user's `ExtendedHealthProfile` (goals, allergies, diets).
        *   An LLM Agent analyzes each candidate against the profile.
        *   The Agent selects the best matches (Top-K) and generates a "Nutritionist's Note" explaining *why* these recipes fit the user's specific needs (e.g., "High protein content supports your muscle-building goal").

## 2. Technology Stack

### Frontend (Next.js)
*   **Framework:** Next.js 15 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, Radix UI (via `shadcn/ui`)
*   **State Management:** React Server Components + Client Hooks
*   **Key Libraries:** `lucide-react` (icons), `framer-motion` (animations), `react-markdown` (content rendering).

### Backend (FastAPI)
*   **Framework:** FastAPI
*   **Language:** Python 3.10+
*   **ML Libraries:**
    *   `faiss-cpu`: For high-speed vector similarity search.
    *   `torch` / `transformers`: For managing embedding models.
    *   `langchain` / `langgraph`: For orchestrating agent workflows (if used in backend agents).
*   **Data Models:** Pydantic for strict type validation.

### Data Storage
*   **Vector Index:** Faiss (`.bin` file).
*   **Raw Data:** Parquet files (`recipes_clean.parquet`) or Database.
*   **User Profiles:** Supabase (PostgreSQL).

## 3. Directory Structure

### Project Root: `e:\v0-ingredient-search-page\`

| Directory | Description |
| :--- | :--- |
| **`app/`** | Next.js App Router source code. |
| `app/api/` | API Routes. `api/recommend` is the main orchestrator. |
| `app/search/` | The main search UI page. |
| **`recommender/`** | Python backend source code. |
| `recommender/main.py` | FastAPI entry point. |
| `recommender/dense_recommender.py` | Core class for vector retrieval. |
| **`lib/`** | Shared utilities for the frontend. |
| `lib/agent-reranker.ts` | **Critical**: Contains the LLM Agent logic and Prompts. |
| **`data/`** | Data assets (embeddings, indices, raw data). |

## 4. Key Component Workflows

### 4.1. Recipe Recommendation Flow
1.  **User Input:** User enters "chicken, broccoli" in the Search UI.
2.  **Frontend Orchestration (`app/api/recommend`):**
    *   Checks for an active `userId`.
    *   Fetches User Profile from Supabase.
3.  **Backend Call:** Frontend calls `http://localhost:8000/recommend` (FastAPI).
4.  **Retrieval:** FastAPI `DenseRecommender` searches the Faiss index and returns Top-20 candidates.
5.  **Agent Reranking:**
    *   Frontend receives Top-20 candidates.
    *   Calls `AgentReranker` (LLM) with candidates + User Profile.
    *   LLM filters down to Top-3 and writes the "Nutritionist Note".
6.  **Display:** UI renders the tailored results and the AI explanation.

### 4.2. Chat Assistant Flow (Proposed)
1.  **User Interaction:** User asks a question about a recipe in the Chat UI.
2.  **API Call:** Request is sent to `/agent/chat` (FastAPI).
3.  **LangGraph Execution:**
    *   The `ChefGraph` in the backend maintains state.
    *   It uses RAG to fetch recipe details if needed.
    *   It generates a text response or triggers a UI component update.

## 5. Development & Extension

### Modifying the AI Persona
To change how the "Nutritionist" behaves, edit the System Prompt in:
*   `lib/agent-reranker.ts` (for Search Reranking)
*   `recommender/graph.py` (for Chat Assistant)

### Switching Models
The system is designed to be model-agnostic.
*   **Frontend Agent:** Configurable in `lib/agent-reranker.ts` (supports OpenAI-compatible APIs like DeepSeek).
*   **Backend Embeddings:** Configurable in `recommender/main.py` (defaults to local models like Qwen).

## 6. Database Schema

### 6.1. Supabase (PostgreSQL)

The system uses Supabase primarily for storing user profiles.

**Table: `user_health_profiles`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `user_id` | UUID (PK) | Unique User Identifier (links to Auth). |
| `created_at` | Timestamp | Record creation time. |
| `age` | Integer | User's age. |
| `gender` | Text | 'male' or 'female'. |
| `height_cm` | Float | Height in centimeters. |
| `weight_kg` | Float | Weight in kilograms. |
| `activity_level` | Text | e.g., 'sedentary', 'active'. |
| `bmi` | Float | Body Mass Index (Calculated). |
| `bmr_calories` | Float | Basal Metabolic Rate. |
| `tdee_calories` | Float | Total Daily Energy Expenditure. |
| `diet_preferences` | API/JSONB | Array of strings (e.g., ["Keto", "Vegan"]). |
| `allergies` | API/JSONB | Array of strings (e.g., ["Peanuts"]). |

**Table: `profiles` (Legacy/Auth)**
*   Used for basic user info (name, email).
*   Linked via `user_id`.

### 6.2. Vector Store (Faiss)

The core search engine relies on file-based vector storage, not a relational DB.

*   **`faiss_index.bin`**: A dense vector index storing 768-dimensional embeddings for 230k+ recipes.
*   **`recipes_clean.parquet`**: A columnar data file containing the metadata for each recipe (Name, Ingredients List, Nutrition Info) corresponding to the vector IDs.

### 6.3. Data Flow
1.  **Read:** `DenseRecommender` loads Parquet + Faiss into RAM at startup.
2.  **Write:** `user_health_profiles` is written to Supabase when a user updates their settings.

