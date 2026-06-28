"""Mercury backend: turns book reflections into Obsidian insight blocks."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import config
from .model import status as model_status

app = FastAPI(title="mercury")

# local-only dev: the Vite frontend calls this from another port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    """Report backend status, MLX model readiness, and vault visibility."""
    vault = config.vault
    return {
        "status": "ok",
        "model": model_status(),
        "vault": {
            "path": str(vault) if vault else None,
            "exists": bool(vault and vault.exists()),
        },
    }
