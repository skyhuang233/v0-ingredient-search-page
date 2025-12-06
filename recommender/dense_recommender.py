from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Any

import faiss
import numpy as np
import pandas as pd
import torch
from transformers import AutoModel, AutoTokenizer


@dataclass
class RecipeResult:
    recipe_id: int
    score: float
    name: str
    ingredients: List[str]
    steps: List[str]
    description: str


class DenseRecommender:
    def __init__(
        self,
        recipes_path: str | Path,
        embeddings_dir: str | Path,
        faiss_index_path: str | Path,
        model_path: str | Path,
        device_map: str = "auto",
        dtype: str = "bfloat16",
    ) -> None:
        self.recipes_df = pd.read_parquet(recipes_path).set_index("id")
        emb_dir = Path(embeddings_dir)
        self.recipe_ids = np.load(emb_dir / "recipe_ids.npy")
        self.index = faiss.read_index(str(faiss_index_path))

        self.tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        self.model = AutoModel.from_pretrained(
            model_path,
            trust_remote_code=True,
            dtype=getattr(torch, dtype) if hasattr(torch, dtype) else dtype,
            device_map=device_map,
        )
        self.model.eval()

    def _embed_query(self, text: str) -> np.ndarray:
        device = next(self.model.parameters()).device
        inputs = self.tokenizer([text], padding=True, truncation=True, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = self.model(**inputs)
            embedding = outputs.last_hidden_state[:, 0]
            embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
        return embedding.cpu().numpy().astype(np.float32)

    def recommend(
        self,
        query: str,
        user_id: int | None = None,
        topk_ann: int = 200,
        topk_final: int = 3,
    ) -> List[RecipeResult]:
        query_vec = self._embed_query(query)
        ann_scores, ann_idx = self.index.search(query_vec, topk_ann)
        candidate_ids = self.recipe_ids[ann_idx[0]]
        scores = ann_scores[0]

        order = np.argsort(-scores)[:topk_final]
        results: List[RecipeResult] = []
        for idx in order:
            recipe_id = int(candidate_ids[idx])
            score = float(scores[idx])
            row = self.recipes_df.loc[recipe_id]
            ingredients = row.get("ingredients", [])
            steps = row.get("steps", [])
            description = row.get("description", "")
            results.append(
                RecipeResult(
                    recipe_id=recipe_id,
                    score=score,
                    name=row.get("name", "Unknown"),
                    ingredients=ingredients if isinstance(ingredients, list) else list(ingredients),
                    steps=steps if isinstance(steps, list) else list(steps),
                    description=str(description),
                )
            )
        return results

    def get_recipe_by_id(self, recipe_id: int) -> Dict[str, Any] | None:
        key = recipe_id
        if key not in self.recipes_df.index:
            str_key = str(recipe_id)
            if str_key not in self.recipes_df.index:
                return None
            key = str_key

        row = self.recipes_df.loc[key]

        def to_list(value: Any) -> List[str]:
            if value is None:
                return []
            if isinstance(value, list):
                return [str(v) for v in value]
            try:
                import numpy as np

                if isinstance(value, np.ndarray):
                    return [str(v) for v in value.tolist()]
            except Exception:
                pass
            return [str(value)]

        return {
            "recipe_id": int(recipe_id),
            "name": row.get("name", "Unknown"),
            "description": row.get("description", ""),
            "ingredients": to_list(row.get("ingredients")),
            "steps": to_list(row.get("steps")),
        }
