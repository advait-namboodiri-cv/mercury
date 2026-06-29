"""The per-book graph layer.

Each book is its own self-contained knowledge graph that grows session by
session. Concepts are scoped to the book: we reuse a book's existing vocabulary
when compressing new sessions, and any concept that recurs across 2+ of that
book's insights is promoted to its own note inside the book's folder.

A promoted concept note holds a short description plus the FULL text of every
insight that calls it home. A story's "home" is the promoted concept it shares
with the most other insights in the book. The story also stays in the book note
(shown in both places). Concepts never link across books.
"""
from __future__ import annotations

import re

from .vault import book_folder, book_note_path, safe_name

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


def _parse_blocks(text: str) -> list[dict]:
    """Return each insight block as {handle, raw, concepts}."""
    blocks: list[dict] = []
    handle: str | None = None
    buf: list[str] = []

    def flush() -> None:
        nonlocal handle, buf
        if handle is not None:
            body = "\n".join(buf).strip()
            raw = f"**{handle}**\n{body}".strip()
            concepts = [
                _link_concept(m.group(1), m.group(2)) for m in _LINK_RE.finditer(body)
            ]
            blocks.append({"handle": handle, "raw": raw, "concepts": concepts})
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
    for block in _parse_blocks(note.read_text(encoding="utf-8")):
        seen.extend(block["concepts"])
    return list(dict.fromkeys(seen))


def _existing_description(path) -> str | None:
    if not path.exists():
        return None
    out: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines()[1:]:
        if line.strip().startswith("## "):
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


def _strip_self_link(raw: str, book_safe: str, concept: str) -> str:
    """Drop the concept's own link from its homed block, leaving plain text."""
    link = f"[[Books/{book_safe}/{safe_name(concept)}|{concept}]]"
    return raw.replace(f" {link}", "").replace(link, "")


def _render_concept(
    concept: str, description: str, book_title: str, book_safe: str,
    homed: list[str], mentioned_handles: list[str],
) -> str:
    backlink = f"[[Books/{book_safe}/{book_safe}|{book_title}]]"
    lines = [f"# {concept}", "", description, "", f"from {backlink}", ""]
    if homed:
        lines.append("## stories")
        lines.append("")
        for raw in homed:
            lines.append(_strip_self_link(raw, book_safe, concept))
            lines.append("")
    else:
        lines.append("## mentioned in")
        for handle in dict.fromkeys(mentioned_handles):
            lines.append(f"- {backlink} — {handle}")
    return "\n".join(lines).rstrip() + "\n"


def sync(book_title: str) -> list[str]:
    """Rebuild this book's concept notes: promote recurring concepts and home each story."""
    note = book_note_path(book_title)
    if not note.exists():
        return []
    blocks = _parse_blocks(note.read_text(encoding="utf-8"))

    counts: dict[str, int] = {}
    for block in blocks:
        for c in block["concepts"]:
            counts[c.lower()] = counts.get(c.lower(), 0) + 1
    promoted = {c for c, n in counts.items() if n >= PROMOTE_AT}
    if not promoted:
        return []

    # assign each story a home: its promoted concept with the most book-wide mentions
    homed: dict[str, list[str]] = {}
    mentioned: dict[str, list[str]] = {}
    for block in blocks:
        pcs = [c for c in block["concepts"] if c.lower() in promoted]
        for c in pcs:
            mentioned.setdefault(c.lower(), []).append(block["handle"])
        if not pcs:
            continue
        pcs.sort(key=lambda c: (-counts[c.lower()], block["concepts"].index(c)))
        homed.setdefault(pcs[0].lower(), []).append(block["raw"])

    folder = book_folder(book_title)
    book_safe = safe_name(book_title)
    folder.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for concept in sorted(promoted):
        path = folder / f"{safe_name(concept)}.md"
        description = _existing_description(path) or define(concept)
        path.write_text(
            _render_concept(
                concept, description, book_title, book_safe,
                homed.get(concept, []), mentioned.get(concept, []),
            ),
            encoding="utf-8",
        )
        written.append(f"{book_safe}/{path.name}")
    return written
