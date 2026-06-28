# mercury

Turn book reflections into compressed insight, written straight into my Obsidian vault, with concept links so the vault graph connects ideas across everything you read.

Local-first: a local LLM (Qwen3 via Apple MLX) does the compression, and notes are written directly to vault folder.

## How it works

1. You speak (or type) a reflection after a reading session.
2. Mercury compresses it into a structured insight.
3. You review and edit the result.
4. On confirm, it's appended as a markdown block under a session heading in that book's note.

Over time the links stitch your books together in Obsidian's graph view.

## Stack

- **Backend:** FastAPI (Python)
- **Frontend:** Vite + React + TypeScript
- **Model:** Qwen3 running locally in-process via MLX
- **Storage:** Obsidian vault
