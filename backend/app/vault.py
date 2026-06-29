"""Read and write the Obsidian vault: one folder per book, with its own notes.

Layout:
    Books/<Book Title>/<Book Title>.md   -> the book note (session blocks)
    Books/<Book Title>/<concept>.md      -> promoted concept nodes (see concepts.py)

Concept links are written as full vault-relative paths so the same word in two
different books stays two separate graph nodes.
"""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

from .config import config


class VaultError(Exception):
    """Raised when the vault is misconfigured or unreachable."""


def books_dir() -> Path:
    v = config.vault
    if v is None:
        raise VaultError("VAULT_PATH is not set")
    if not v.exists():
        raise VaultError(f"vault path does not exist: {v}")
    return v / "Books"


def safe_name(name: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]', "-", name.strip())
    return cleaned or "Untitled"


def book_folder(title: str) -> Path:
    return books_dir() / safe_name(title)


def book_note_path(title: str) -> Path:
    safe = safe_name(title)
    return books_dir() / safe / f"{safe}.md"


def _read_frontmatter(p: Path) -> dict:
    """Minimal YAML frontmatter read for the fields we list (title/author/status)."""
    text = p.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    fm: dict[str, str] = {}
    for line in text[3:end].strip("\n").splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            fm[key.strip()] = val.strip()
    return fm


def _parse_tags(raw: str) -> list[str]:
    """Parse a frontmatter tags value like '[a, b]' into a list."""
    return [t.strip() for t in raw.strip().lstrip("[").rstrip("]").split(",") if t.strip()]


def _count_insights(text: str) -> int:
    """Count insight blocks (lines that are a bold handle) in a book note."""
    return sum(
        1
        for line in text.splitlines()
        if (s := line.strip()).startswith("**") and s.endswith("**") and len(s) > 4
    )


def list_books() -> list[dict]:
    """Return existing book notes (one per folder) with their frontmatter basics."""
    d = books_dir()
    if not d.exists():
        return []
    out = []
    for folder in sorted(p for p in d.iterdir() if p.is_dir()):
        note = folder / f"{folder.name}.md"
        if not note.exists():
            continue
        text = note.read_text(encoding="utf-8")
        fm = _read_frontmatter(note)
        out.append(
            {
                "title": fm.get("title") or folder.name,
                "author": fm.get("author") or None,
                "status": fm.get("status") or None,
                "tags": _parse_tags(fm.get("tags", "")),
                "insightCount": _count_insights(text),
                "folder": folder.name,
            }
        )
    return out


def _frontmatter(title: str, author: str | None, status: str | None, tags: list[str]) -> str:
    tags_str = "[" + ", ".join(tags) + "]" if tags else "[]"
    return (
        "---\n"
        f"title: {title}\n"
        f"author: {author or ''}\n"
        f"status: {status or 'reading'}\n"
        f"started: {date.today().isoformat()}\n"
        f"tags: {tags_str}\n"
        "---\n"
    )


def _concept_link(book_safe: str, concept: str) -> str:
    """A folder-scoped wikilink so this concept node is unique to this book."""
    return f"[[Books/{book_safe}/{safe_name(concept)}|{concept}]]"


def _render_block(insight: dict, book_safe: str) -> str:
    body = insight["body"].strip()
    links = " ".join(_concept_link(book_safe, c) for c in (insight.get("concepts") or []))
    block = f"**{insight['type']} · {insight['title']}**\n{body}"
    if links:
        block += f" {links}"
    quote = insight.get("verbatim_quote")
    if quote:
        block += f'\n\n> "{quote}"'
    return block


def save_block(
    book_title: str,
    insight: dict,
    author: str | None = None,
    status: str | None = None,
    tags: list[str] | None = None,
) -> dict:
    """Append a rendered insight block to a book note, creating its folder if needed."""
    folder = book_folder(book_title)
    folder.mkdir(parents=True, exist_ok=True)
    p = book_note_path(book_title)
    created = not p.exists()
    today = date.today().isoformat()
    heading = f"## Session {today}"
    block = _render_block(insight, safe_name(book_title))

    if created:
        content = _frontmatter(book_title, author, status, tags or []) + "\n"
        content += f"{heading}\n\n{block}\n"
    else:
        existing = p.read_text(encoding="utf-8").rstrip()
        if heading in existing:
            content = f"{existing}\n\n{block}\n"
        else:
            content = f"{existing}\n\n{heading}\n\n{block}\n"

    p.write_text(content, encoding="utf-8")
    return {
        "folder": folder.name,
        "file": f"{folder.name}/{p.name}",
        "created": created,
        "session": today,
    }
