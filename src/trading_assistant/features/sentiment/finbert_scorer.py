from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)


class FinBERTScorer:
    def __init__(self, model_name: str = "ProsusAI/finbert", batch_size: int = 16, pipeline_factory: Any = None):
        self.model_name = model_name
        self.batch_size = batch_size
        self._pipeline_factory = pipeline_factory
        self._pipeline = None

    def _load(self):
        if self._pipeline is None:
            if self._pipeline_factory is not None:
                factory = self._pipeline_factory
            else:
                from transformers import pipeline
                factory = pipeline
            self._pipeline = factory("text-classification", model=self.model_name, tokenizer=self.model_name, return_all_scores=True, truncation=True)
            log.info("Loaded local FinBERT model %s", self.model_name)
        return self._pipeline

    def score(self, texts: list[str]) -> list[dict]:
        if not texts:
            return []
        classifier = self._load()
        output: list[dict] = []
        for offset in range(0, len(texts), self.batch_size):
            batch = texts[offset:offset + self.batch_size]
            predictions = classifier(batch)
            for scores in predictions:
                by_label = {item["label"].lower(): float(item["score"]) for item in scores}
                probs = {"positive": by_label.get("positive", 0.0), "negative": by_label.get("negative", 0.0), "neutral": by_label.get("neutral", 0.0)}
                label = max(probs, key=probs.get)
                output.append({**probs, "label": label, "computed_at": datetime.now(timezone.utc).isoformat()})
        return output
