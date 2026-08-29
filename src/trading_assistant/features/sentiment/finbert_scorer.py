from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

_POSITIVE = {"beat", "beats", "bullish", "buy", "gains", "growth", "higher", "improve", "positive", "profit", "rally", "strong", "upgraded", "surge"}
_NEGATIVE = {"bearish", "buying", "crash", "decline", "downgrade", "fall", "fraud", "lower", "loss", "negative", "risk", "sell", "slump", "weak"}


class FinBERTScorer:
    def __init__(self, model_name: str = "ProsusAI/finbert", batch_size: int = 16, pipeline_factory: Any = None):
        self.model_name = model_name
        self.batch_size = batch_size
        self._pipeline_factory = pipeline_factory
        self._pipeline = None
        self._fallback = False

    def _load(self):
        if self._pipeline is None and not self._fallback:
            try:
                if self._pipeline_factory is not None:
                    factory = self._pipeline_factory
                else:
                    from transformers import pipeline
                    factory = pipeline
                self._pipeline = factory("text-classification", model=self.model_name, tokenizer=self.model_name, return_all_scores=True, truncation=True)
                log.info("Loaded local FinBERT model %s", self.model_name)
            except (ImportError, OSError, RuntimeError) as exc:
                self._fallback = True
                log.warning("FinBERT unavailable; using lightweight local sentiment fallback: %s", exc)
        return self._pipeline

    @staticmethod
    def _fallback_score(text: str) -> dict:
        tokens = set(re.findall(r"[a-z]+", text.lower()))
        positive = len(tokens & _POSITIVE)
        negative = len(tokens & _NEGATIVE)
        if positive == negative:
            return {"positive": 0.2, "negative": 0.2, "neutral": 0.6, "label": "neutral"}
        if positive > negative:
            return {"positive": 0.6, "negative": 0.1, "neutral": 0.3, "label": "positive"}
        return {"positive": 0.1, "negative": 0.6, "neutral": 0.3, "label": "negative"}

    def score(self, texts: list[str]) -> list[dict]:
        if not texts:
            return []
        classifier = self._load()
        if self._fallback:
            return [{**self._fallback_score(text), "computed_at": datetime.now(timezone.utc).isoformat()} for text in texts]
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
