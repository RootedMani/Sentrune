from __future__ import annotations

import pandas as pd

from .contributions import CLASS_NAMES, feature_contributions

# Human-readable labels and a short "what this means when it's driving a
# prediction" phrase for every feature the modeling layer can use. Sentiment
# columns are handled separately below since their names are generated
# dynamically per configured window (e.g. avg_sentiment_24h).
TECHNICAL_DESCRIPTIONS: dict[str, tuple[str, str]] = {
    "sma_20": ("the 20-day moving average", "short-term trend"),
    "sma_50": ("the 50-day moving average", "medium-term trend"),
    "sma_200": ("the 200-day moving average", "long-term trend"),
    "ema_12": ("the 12-day exponential average", "short-term trend"),
    "ema_26": ("the 26-day exponential average", "medium-term trend"),
    "macd": ("MACD", "trend momentum"),
    "macd_signal": ("the MACD signal line", "trend momentum"),
    "macd_histogram": ("the MACD histogram", "momentum acceleration"),
    "rsi_14": ("RSI(14)", "overbought/oversold conditions"),
    "stoch_k": ("the stochastic %K", "short-term momentum"),
    "stoch_d": ("the stochastic %D", "short-term momentum"),
    "bb_lower": ("the lower Bollinger Band", "volatility range"),
    "bb_middle": ("the middle Bollinger Band", "volatility range"),
    "bb_upper": ("the upper Bollinger Band", "volatility range"),
    "atr_14": ("ATR(14)", "recent volatility"),
    "obv": ("On-Balance Volume", "volume-confirmed trend"),
    "volume_sma_20": ("the 20-day average volume", "trading activity"),
    "adx_14": ("ADX(14)", "trend strength"),
    "plus_di_14": ("+DI(14)", "upward directional pressure"),
    "minus_di_14": ("-DI(14)", "downward directional pressure"),
    "ichimoku_tenkan": ("the Ichimoku conversion line", "short-term trend"),
    "ichimoku_kijun": ("the Ichimoku base line", "medium-term trend"),
    "ichimoku_senkou_a": ("Ichimoku leading span A", "cloud support/resistance"),
    "ichimoku_senkou_b": ("Ichimoku leading span B", "cloud support/resistance"),
    "ichimoku_chikou": ("the Ichimoku lagging span", "trend confirmation"),
    "volatility_20": ("20-day realized volatility", "recent volatility"),
    "return_autocorr_20": ("20-day return autocorrelation", "trend persistence"),
    "volume_price_divergence": ("volume/price divergence", "conviction behind the move"),
    "candle_body_ratio": ("candle body ratio", "conviction of the latest bar"),
    "candle_doji": ("a doji candle pattern", "market indecision"),
    "candle_hammer": ("a hammer candle pattern", "potential reversal"),
    "candle_bullish_engulfing": ("a bullish engulfing pattern", "potential upside reversal"),
    "candle_bearish_engulfing": ("a bearish engulfing pattern", "potential downside reversal"),
    "return_1": ("the most recent 1-bar return", "immediate price action"),
    "return_3": ("the 3-bar return", "short-term price action"),
    "return_5": ("the 5-bar return", "short-term price action"),
    "return_10": ("the 10-bar return", "medium-term price action"),
    "zscore_20": ("the 20-day price z-score", "how stretched price is from its recent average"),
    "volatility_regime": ("the current volatility regime", "how turbulent trading has been"),
    "day_of_week": ("the day of the week", "calendar seasonality"),
    "dist_from_high": ("distance from the recent high", "proximity to resistance"),
    "dist_from_low": ("distance from the recent low", "proximity to support"),
}

SENTIMENT_BASE_DESCRIPTIONS: dict[str, tuple[str, str]] = {
    "avg_sentiment": ("average news/social sentiment", "overall tone of coverage"),
    "avg_sentiment_decayed": ("recency-weighted sentiment", "how tone has been trending"),
    "mention_volume": ("mention volume", "how much this asset is being talked about"),
    "sentiment_volatility": ("sentiment volatility", "how much opinion has been swinging"),
    "followed_avg_sentiment": ("sentiment from followed sources", "tone from accounts you track"),
    "followed_mention_volume": ("mention volume from followed sources", "activity from accounts you track"),
    "followed_sentiment_volatility": ("sentiment swings from followed sources", "how much tracked accounts disagree"),
    "unattributed_avg_sentiment": ("broad crowd sentiment", "tone from the wider, untracked crowd"),
    "unattributed_mention_volume": ("broad crowd mention volume", "how much the wider crowd is discussing this"),
    "unattributed_sentiment_volatility": ("broad crowd sentiment volatility", "how much untracked opinion is swinging"),
}


def _describe_feature(column: str) -> tuple[str, str]:
    if column in TECHNICAL_DESCRIPTIONS:
        return TECHNICAL_DESCRIPTIONS[column]
    base, _, suffix = column.rpartition("_")
    if base in SENTIMENT_BASE_DESCRIPTIONS and suffix.endswith("h") and suffix[:-1].isdigit():
        label, meaning = SENTIMENT_BASE_DESCRIPTIONS[base]
        hours = int(suffix[:-1])
        window = f"{hours // 24}-day" if hours % 24 == 0 and hours >= 24 else f"{hours}-hour"
        return f"{label} over the last {window}", meaning
    return column.replace("_", " "), "a model input"


def explain_prediction(
    model,
    X: pd.DataFrame,
    probabilities: dict[str, float],
    top_n: int = 3,
) -> dict:
    """Build a plain-English explanation for one prediction.

    Returns a dict with the predicted label, the top contributing features
    (raw name, human label, signed contribution, and current value), and a
    ready-to-display sentence. Contributions are computed for whichever
    class currently has the highest probability, since "why does the model
    lean this way" is the natural question for the label actually shown.
    """
    predicted_label = max(probabilities, key=probabilities.get)
    predicted_index = CLASS_NAMES.index(predicted_label)
    contributions = feature_contributions(model, X, predicted_index)

    top = contributions.head(top_n)
    factors = []
    for column, contribution in top.items():
        label, meaning = _describe_feature(column)
        direction = "supporting" if contribution > 0 else "working against"
        factors.append({
            "column": column,
            "label": label,
            "meaning": meaning,
            "contribution": float(contribution),
            "value": float(X.iloc[0][column]),
            "direction": direction,
        })

    confidence = probabilities[predicted_label]
    confidence_word = "strongly" if confidence >= 0.6 else "moderately" if confidence >= 0.45 else "only weakly"
    verb = {"up": "rising", "down": "falling", "flat": "staying roughly flat"}[predicted_label]

    if factors:
        supporting = [f for f in factors if f["direction"] == "supporting"]
        opposing = [f for f in factors if f["direction"] == "working against"]
        lead = supporting[0] if supporting else factors[0]
        sentence = f"The model leans {confidence_word} toward {verb} ({confidence * 100:.0f}% probability), driven mainly by {lead['label']} ({lead['meaning']})."
        if len(supporting) > 1:
            extra = supporting[1]
            sentence += f" {extra['label'][0].upper()}{extra['label'][1:]} also supports this read."
        if opposing:
            against = opposing[0]
            sentence += f" The main factor pulling the other way is {against['label']}."
    else:
        sentence = f"The model leans {confidence_word} toward {verb} ({confidence * 100:.0f}% probability), but no individual feature stands out as a dominant driver."

    return {
        "predicted_label": predicted_label,
        "confidence": float(confidence),
        "probabilities": probabilities,
        "top_factors": factors,
        "sentence": sentence,
    }
