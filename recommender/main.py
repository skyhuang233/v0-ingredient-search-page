from __future__ import annotations

import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from dense_recommender import DenseRecommender
except ModuleNotFoundError:
    from recommender.dense_recommender import DenseRecommender


class RecommendRequest(BaseModel):
    ingredients: List[str]
    user_id: int | None = None
    topk: int | None = None


class RecommendResponse(BaseModel):
    recipe_id: int
    score: float
    name: str
    ingredients: List[str]
    steps: List[str]
    description: str



# Pydantic models for Agent Chat
class AgentChatRequest(BaseModel):
    message: str
    images: List[str] = [] # List of base64 strings or URLs
    context: dict | None = None # Active Recipe Context
    history: List[dict] = []  # Expected format: [{"role": "user", "content": "..."}, ...]


class AgentChatResponse(BaseModel):
    response: str
    ui: dict | None = None # For Generative UI components


def create_app() -> FastAPI:
    recipes_path = os.environ.get("RECIPES_PATH", "data/processed/recipes_clean.parquet")
    embeddings_dir = os.environ.get("EMBEDDINGS_DIR", "data/embeddings_0p6b")
    faiss_index = os.environ.get("FAISS_INDEX", "data/embeddings_0p6b/faiss_index.bin")
    default_model_path = "/mnt/e/models/Qwen3-Embedding-0.6B"
    if os.name == "nt":
        default_model_path = "E:\\models\\Qwen3-Embedding-0.6B"
    model_path = os.environ.get("MODEL_PATH", default_model_path)
    device_map = os.environ.get("DEVICE_MAP", "auto")
    dtype = os.environ.get("MODEL_DTYPE", "bfloat16")

    recommender = DenseRecommender(
        recipes_path=recipes_path,
        embeddings_dir=embeddings_dir,
        faiss_index_path=faiss_index,
        model_path=model_path,
        device_map=device_map,
        dtype=dtype,
    )

    # Initialize LangGraph
    try:
        try:
            from graph import create_chef_graph, SYSTEM_PROMPT
        except ModuleNotFoundError:
            from recommender.graph import create_chef_graph, SYSTEM_PROMPT
        
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage # Added ToolMessage

        chef_graph = create_chef_graph(recommender)
        print("LangGraph Agent initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize LangGraph Agent: {e}")
        chef_graph = None

    app = FastAPI()

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/recommend", response_model=List[RecommendResponse])
    def recommend(payload: RecommendRequest):
        if not payload.ingredients:
            raise HTTPException(status_code=400, detail="Ingredients list cannot be empty")
        query = ", ".join(payload.ingredients)
        results = recommender.recommend(query=query, user_id=payload.user_id, topk_final=payload.topk or 3)
        return [RecommendResponse(**result.__dict__) for result in results]

    @app.get("/recipe/{recipe_id}")
    def get_recipe(recipe_id: int):
        data = recommender.get_recipe_by_id(recipe_id)
        if data is None:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return data

    @app.post("/agent/chat", response_model=AgentChatResponse)
    async def agent_chat(payload: AgentChatRequest):
        if not chef_graph:
            raise HTTPException(status_code=503, detail="Agent service not available")

        # Convert history
        # Inject Context into System Prompt
        sys_prompt = SYSTEM_PROMPT
        if payload.context:
            recipe_name = payload.context.get("name", "Unknown Recipe")
            ingredients = ", ".join(payload.context.get("ingredients", []))
            sys_prompt += f"\n\nCURRENT CONTEXT: The user is currently looking at the recipe '{recipe_name}'. Ingredients: {ingredients}. Help them specifically with this recipe."

        messages = [SystemMessage(content=sys_prompt)]
        for msg in payload.history:
            if msg['role'] == 'user':
                messages.append(HumanMessage(content=msg['content']))
            elif msg['role'] == 'assistant':
                messages.append(AIMessage(content=msg['content']))
        
        # Add current user input
        # Note: In LangGraph, we typically pass the full state. 
        # If payload.history already contains the latest user message, we are good.
        # But our frontend "messages" usually includes the pending user message at the end.
        
        if payload.images:
            # Multimodal message construction
            content = [{"type": "text", "text": payload.message}]
            for img in payload.images:
                content.append({
                    "type": "image_url", 
                    "image_url": {"url": img} # base64 or http url
                })
            messages.append(HumanMessage(content=content))
        else:
            messages.append(HumanMessage(content=payload.message))

        try:
            # Invoke Graph
            # The output of invoke is the final state. We want the last message from the agent.
            final_state = await chef_graph.ainvoke({"messages": messages})
            
            last_message = final_state["messages"][-1]
            response_text = last_message.content

            # CHECK FOR UI SIGNALS
            # We look at recent messages. If the *last* turn included a Tool Call to 'ui_show_recipes', 
            # we want to grab that tool's output.
            
            ui_payload = None
            reversed_msgs = final_state["messages"][::-1]
            
            # Look for the ToolMessage corresponding to ui_show_recipes
            for msg in reversed_msgs:
                # Stop if we hit a human message (start of this turn)
                if isinstance(msg, HumanMessage):
                    break
                    
                if isinstance(msg, ToolMessage):
                     # Check if this tool message is from our UI tool. 
                     # We can iterate through the tool calls of the message *before* it to verify name, 
                     # OR just check if the content looks like our JSON signal.
                     try:
                         data = json.loads(msg.content)
                         if isinstance(data, dict) and data.get("type") == "ui_component":
                             ui_payload = data
                             break
                     except:
                         pass

            return AgentChatResponse(response=response_text, ui=ui_payload)
            
        except Exception as e:
            print(f"Agent error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return app


app = create_app()
