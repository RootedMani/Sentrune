from __future__ import annotations

import json
from pathlib import Path
import joblib
import pandas as pd

class Predictor:
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)

    def save(self, model, asset_id: int, trained_at: str, feature_columns: list[str]) -> str:
        path = self.model_dir / str(asset_id)
        path.mkdir(parents=True, exist_ok=True)
        artifact = path / f"lightgbm_{trained_at.replace(':', '').replace('+00:00', 'Z')}.joblib"
        joblib.dump({"model": model, "feature_columns": feature_columns, "asset_id": asset_id, "trained_at": trained_at}, artifact)
        return str(artifact)

    def load(self, path: str):
        return joblib.load(path)

    def predict(self, artifact_path: str, features: dict) -> dict[str, float]:
        artifact = self.load(artifact_path)
        X = pd.DataFrame([[features[c] for c in artifact["feature_columns"]]], columns=artifact["feature_columns"])
        probabilities = artifact["model"].predict_proba(X)[0]
        return {"down": float(probabilities[0]), "flat": float(probabilities[1]), "up": float(probabilities[2])}
