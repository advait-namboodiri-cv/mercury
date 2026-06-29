"""Mercury backend: turns book reflections into Obsidian insight blocks."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .compress import compress
from .concepts import book_concepts
from .concepts import sync as sync_concepts
from .config import config
from .model import status as model_status
from .vault import (
    VaultError,
    append_session,
    list_books,
    list_sessions,
    save_block,
)

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
    # concepts captured earlier this reading session but not yet saved to the vault
    session_concepts: list[str] = []


@app.post("/compress")
def compress_endpoint(req: CompressRequest) -> dict:
    """Compress a raw reflection into the strict insight JSON."""
    try:
        saved = book_concepts(req.book) if req.book else []
        existing = list(dict.fromkeys(saved + req.session_concepts))
        return compress(req.text, req.book, existing)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"compression error: {exc}") from exc


class Insight(BaseModel):
    type: str
    title: str
    body: str
    concepts: list[str] = []
    verbatim_quote: str | None = None


class SessionRequest(BaseModel):
    book: str
    insights: list[Insight]
    author: str | None = None
    tags: list[str] = []
    duration_min: int = 0


@app.get("/books")
def books_endpoint() -> dict:
    """List existing book notes in the vault."""
    try:
        return {"books": list_books()}
    except VaultError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/session")
def session_endpoint(req: SessionRequest) -> dict:
    """Write a whole reading session: all insights, one concept sync, one journal entry."""
    if not req.insights:
        raise HTTPException(status_code=422, detail="a session needs at least one insight")
    try:
        when = ""
        for insight in req.insights:
            result = save_block(req.book, insight.model_dump(), req.author, None, req.tags)
            when = result["session"]
        concept_notes = sync_concepts(req.book)
        append_session(req.book, len(req.insights), req.duration_min, when)
        return {
            "book": req.book,
            "count": len(req.insights),
            "date": when,
            "concept_notes": concept_notes,
        }
    except VaultError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/sessions")
def sessions_endpoint() -> dict:
    """Return the reading-session journal, newest first."""
    try:
        return {"sessions": list_sessions()}
    except VaultError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
