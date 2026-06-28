"""Read and write the Obsidian vault: one markdown note per book."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

from .config import config


class VaultError(Exception):
    """Raised when the vault is misconfigured or unreachable."""


def books_dir() -> Path:
    """Resolve <vault>/Books, erroring if the vault path is unset/missing."""
    v = config.vault
    if v is None:
        raise VaultError("VAULT_PATH is not set")
    if not v.exists():
        raise VaultError(f"vault path does not exist: {v}")
    return v / "Books"


def _safe_filename(title: str) -> str:
    name = re.sub(r'[\\/:*?"<>|]', "-", title.strip())
    return name or "Untitled"


def book_path(title: str) -> Path:
    return books_dir() / f"{_safe_filename(title)}.md"


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


def list_books() -> list[dict]:
    """Return existing book notes with their frontmatter basics."""
    d = books_dir()
    if not d.exists():
        return []
    out = []
    for p in sorted(d.glob("*.md")):
        fm = _read_frontmatter(p)
        out.append(
            {
                "title": fm.get("title") or p.stem,
                "author": fm.get("author") or None,
                "status": fm.get("status") or None,
                "file": p.name,
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


def _render_block(insight: dict) -> str:
    body = insight["body"].strip()
    links = " ".join(f"[[{c}]]" for c in (insight.get("concepts") or []))
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
    """Append a rendered insight block to a book note, creating it if needed."""
    d = books_dir()
    d.mkdir(parents=True, exist_ok=True)
    p = book_path(book_title)
    created = not p.exists()
    today = date.today().isoformat()
    heading = f"## Session {today}"
    block = _render_block(insight)

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
    return {"file": p.name, "path": str(p), "created": created, "session": today}
