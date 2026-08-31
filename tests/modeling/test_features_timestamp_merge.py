import pandas as pd

from trading_assistant.modeling.features import assemble_features, make_labels


def test_assemble_features_joins_across_mismatched_timestamp_string_formats():
    """Regression test: technical_features rows are written with
    str(pandas.Timestamp) ("2024-01-01 00:00:00+00:00", space-separated),
    while price_bars/labels timestamps come through as ISO 'T'-separated
    strings ("2024-01-01T00:00:00+00:00"). assemble_features previously
    merged technical and labels on the raw string columns before normalizing
    either to a real datetime, so every row silently failed to match and
    training produced an empty dataset with no error - "asset N has only 0
    usable rows" was the only symptom. This pins the fix: the two frames
    must still join correctly even when their timestamp strings use
    different (but equivalent) formats.
    """
    dates = pd.date_range("2024-01-01", periods=5, freq="D", tz="UTC")
    technical = pd.DataFrame({
        "asset_id": [1] * 5,
        "interval": ["1d"] * 5,
        "timestamp": [str(d) for d in dates],  # space-separated, as compute_technical writes
        "sma_20": [101.0, 102.0, 103.0, 104.0, 105.0],
    })
    prices = pd.DataFrame({
        "asset_id": [1] * 6,
        "interval": ["1d"] * 6,
        "timestamp": [d.isoformat() for d in pd.date_range("2024-01-01", periods=6, freq="D", tz="UTC")],  # ISO 'T'-separated
        "close": [100.0, 101.0, 102.5, 101.5, 103.0, 104.0],
    })
    labels = make_labels(prices, horizon_bars=1, dead_zone=0.001)

    dataset = assemble_features(technical, sentiment=None, labels=labels, feature_columns=["sma_20"])

    assert len(dataset) == 5, "technical and label rows should join despite differing timestamp string formats"
    assert set(dataset["label"].unique()) <= {0, 1, 2}
