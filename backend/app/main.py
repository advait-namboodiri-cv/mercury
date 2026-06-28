"""Mercury backend: turns book reflections into Obsidian insight blocks."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .compress import compress
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


class CompressRequest(BaseModel):
    text: str
    book: str | None = None


@app.post("/compress")
def compress_endpoint(req: CompressRequest) -> dict:
    """Compress a raw reflection into the strict insight JSON."""
    try:
        return compress(req.text, req.book)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"compression error: {exc}") from exc


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
