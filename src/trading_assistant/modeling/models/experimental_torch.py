from __future__ import annotations

try:
    import torch
    import torch.nn as nn
except ImportError:  # Optional research dependency; the primary path remains usable.
    torch = None
    nn = None


if nn is not None:
    class ExperimentalLSTM(nn.Module):
        """Research-only LSTM comparison model; not the shipped predictor."""
        def __init__(self, input_size: int, hidden_size: int = 32, num_layers: int = 1):
            super().__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
            self.output = nn.Linear(hidden_size, 3)

        def forward(self, x):
            sequence, _ = self.lstm(x)
            return self.output(sequence[:, -1, :])
else:
    class ExperimentalLSTM:
        def __init__(self, *args, **kwargs):
            raise RuntimeError("PyTorch is required only for the experimental LSTM")
