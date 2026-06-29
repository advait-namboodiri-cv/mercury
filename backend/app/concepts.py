"""The per-book graph layer.

Each book is its own self-contained knowledge graph that grows session by
session. Concepts are scoped to the book: we reuse a book's existing vocabulary
when compressing new sessions, and any concept that recurs across 2+ of that
book's insights is promoted to its own note inside the book's folder (with a
short description plus backlinks). One-off concepts stay inline. Concepts never
link across books.
"""
from __future__ import annotations

import re

from .vault import (
    _read_frontmatter,
    book_folder,
    book_note_path,
    safe_name,
)

MENTIONS_HEADING = "## mentioned in"
PROMOTE_AT = 2  # references within a book before a concept gets its own node

_LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")

CONCEPT_SYSTEM = (
    "You write one short, plain definition for a personal notes glossary. "
    "Given a concept, reply with a single sentence of at most 20 words defining it "
    "simply. No preamble, no quotes, no markdown, just the sentence."
)


def _link_concept(target: str, alias: str | None) -> str:
    """Resolve a wikilink to the bare concept name (alias, else last path segment)."""
    return (alias or target.split("/")[-1]).strip()


def _parse_blocks(text: str) -> list[tuple[str, list[str]]]:
    """Return (handle, concepts) for each insight block in a book note."""
    blocks: list[tuple[str, list[str]]] = []
    handle: str | None = None
    buf: list[str] = []

    def flush() -> None:
        nonlocal handle, buf
        if handle is not None:
            concepts = [
                _link_concept(m.group(1), m.group(2))
                for m in _LINK_RE.finditer("\n".join(buf))
            ]
            blocks.append((handle, concepts))
        handle, buf = None, []

    for line in text.splitlines():
        s = line.strip()
        if s.startswith("**") and s.endswith("**") and len(s) > 4:
            flush()
            handle = s.strip("*").strip()
        elif s.startswith("## "):
            flush()
        elif handle is not None:
            buf.append(line)
    flush()
    return blocks


def book_concepts(book_title: str) -> list[str]:
    """The concepts already used in this book, for reuse when compressing."""
    note = book_note_path(book_title)
    if not note.exists():
        return []
    seen: list[str] = []
    for _, concepts in _parse_blocks(note.read_text(encoding="utf-8")):
        seen.extend(concepts)
    return list(dict.fromkeys(seen))


def _references(book_title: str) -> dict[str, list[str]]:
    """Map concept (lowercased) -> list of handles, within this one book."""
    note = book_note_path(book_title)
    refs: dict[str, list[str]] = {}
    if not note.exists():
        return refs
    for handle, concepts in _parse_blocks(note.read_text(encoding="utf-8")):
        for c in concepts:
            refs.setdefault(c.lower(), []).append(handle)
    return refs


def _existing_description(path) -> str | None:
    if not path.exists():
        return None
    out: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines()[1:]:
        if line.strip().startswith(MENTIONS_HEADING):
            break
        if line.strip():
            out.append(line.strip())
    return " ".join(out) or None


def define(concept: str) -> str:
    """Generate a one-line plain definition of a concept via the local model."""
    from mlx_lm import generate
    from mlx_lm.sample_utils import make_sampler

    from .model import load

    model, tokenizer = load()
    messages = [
        {"role": "system", "content": CONCEPT_SYSTEM},
        {"role": "user", "content": concept},
    ]
    try:
        prompt = tokenizer.apply_chat_template(
            messages, add_generation_prompt=True, enable_thinking=False
        )
    except TypeError:
        prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    raw = generate(
        model, tokenizer, prompt=prompt, max_tokens=80,
        sampler=make_sampler(temp=0.3), verbose=False,
    )
    text = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL)
    return " ".join(text.replace("`", "").strip().strip('"').split())


def _render_concept(
    concept: str, description: str, book_title: str, book_safe: str, handles: list[str]
) -> str:
    backlink = f"[[Books/{book_safe}/{book_safe}|{book_title}]]"
    lines = [f"# {concept}", "", description, "", MENTIONS_HEADING]
    for handle in dict.fromkeys(handles):
        lines.append(f"- {backlink} — {handle}")
    return "\n".join(lines) + "\n"


def sync(book_title: str, concepts: list[str]) -> list[str]:
    """Promote this book's concepts that now recur (2+ refs) into their own notes."""
    refs = _references(book_title)
    folder = book_folder(book_title)
    book_safe = safe_name(book_title)
    promoted: list[str] = []
    for concept in {c.lower() for c in concepts if c.strip()}:
        handles = list(dict.fromkeys(refs.get(concept, [])))
        if len(handles) < PROMOTE_AT:
            continue  # one-off: stays an inline link
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{safe_name(concept)}.md"
        description = _existing_description(path) or define(concept)
        path.write_text(
            _render_concept(concept, description, book_title, book_safe, handles),
            encoding="utf-8",
        )
        promoted.append(f"{book_safe}/{path.name}")
    return promoted
