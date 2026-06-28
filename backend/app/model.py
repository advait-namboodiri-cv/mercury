"""In-process MLX model: loads Qwen3 once and serves text generation."""
from __future__ import annotations

import importlib.util

from .config import config

# loaded lazily so the server starts instantly; first generate() pays the cost
_model = None
_tokenizer = None


def mlx_available() -> bool:
    """True if the mlx-lm package is importable in this environment."""
    return importlib.util.find_spec("mlx_lm") is not None


def model_cached() -> bool:
    """True if the configured model weights are already in the local HF cache."""
    try:
        from huggingface_hub import try_to_load_from_cache

        path = try_to_load_from_cache(config.MLX_MODEL, "config.json")
        return isinstance(path, str)
    except Exception:  # noqa: BLE001
        return False


def load():
    """Load and memoize the MLX model + tokenizer."""
    global _model, _tokenizer
    if _model is None:
        from mlx_lm import load as mlx_load

        _model, _tokenizer = mlx_load(config.MLX_MODEL)
    return _model, _tokenizer


def status() -> dict:
    """Lightweight health view: never loads weights, just reports readiness."""
    return {
        "framework": "mlx",
        "model": config.MLX_MODEL,
        "mlx_available": mlx_available(),
        "model_cached": model_cached(),
        "loaded": _model is not None,
    }
