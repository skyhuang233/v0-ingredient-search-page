from __future__ import annotations

import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json

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
        
        if payload.images:
            content = [{"type": "text", "text": payload.message}]
            for img in payload.images:
                content.append({"type": "image_url", "image_url": {"url": img}})
            messages.append(HumanMessage(content=content))
        else:
            messages.append(HumanMessage(content=payload.message))

        try:
            final_state = await chef_graph.ainvoke({"messages": messages})
            last_message = final_state["messages"][-1]
            response_text = last_message.content

            if isinstance(response_text, list):
                response_text = "".join([part.get("text", "") for part in response_text if isinstance(part, dict) and "text" in part])
            else:
                response_text = str(response_text)

            ui_payload = None
            reversed_msgs = final_state["messages"][::-1]
            for msg in reversed_msgs:
                if isinstance(msg, HumanMessage):
                    break
                if isinstance(msg, ToolMessage):
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

    @app.post("/agent/chat/stream")
    async def agent_chat_stream(payload: AgentChatRequest):
        if not chef_graph:
            raise HTTPException(status_code=503, detail="Agent service not available")

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
        
        if payload.images:
            content = [{"type": "text", "text": payload.message}]
            for img in payload.images:
                content.append({"type": "image_url", "image_url": {"url": img}})
            messages.append(HumanMessage(content=content))
        else:
            messages.append(HumanMessage(content=payload.message))

        async def event_generator():
            try:
                # Use astream_events to get real-time chunks and tool outputs
                async for event in chef_graph.astream_events({"messages": messages}, version="v2"):
                    kind = event["event"]
                    
                    if kind == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if isinstance(content, list):
                            text = "".join([part.get("text", "") for part in content if isinstance(part, dict) and "text" in part])
                        else:
                            text = str(content)
                        if text:
                            yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
                    
                    elif kind == "on_tool_end":
                        if event["name"] == "ui_show_recipes":
                            try:
                                raw_output = event["data"]["output"]
                                # Output may be a ToolMessage object or a plain string
                                raw_str = raw_output.content if hasattr(raw_output, "content") else str(raw_output)
                                data = json.loads(raw_str)
                                if isinstance(data, dict) and data.get("type") == "ui_component":
                                    yield f"data: {json.dumps({'type': 'ui', 'content': data})}\n\n"
                            except:
                                pass
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                print(f"Streaming error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    return app


app = create_app()
