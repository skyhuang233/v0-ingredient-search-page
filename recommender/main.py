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


def create_app() -> FastAPI:
    recipes_path = os.environ.get("RECIPES_PATH", "data/processed/recipes_clean.parquet")
    embeddings_dir = os.environ.get("EMBEDDINGS_DIR", "data/embeddings")
    faiss_index = os.environ.get("FAISS_INDEX", "data/embeddings/faiss_index.bin")
    model_path = os.environ.get("MODEL_PATH", "/mnt/e/models/Qwen3-Embedding-0.6B")
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

    return app


app = create_app()
