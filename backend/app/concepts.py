"""The graph layer: promote well-connected concepts into their own vault notes.

Every concept already appears as an inline [[link]] inside a book note. Here we
scan the whole vault and, for any concept that connects across 2+ places, create
a Concepts/<concept>.md node with a short description plus backlinks to every
book/insight (including stories) that touched it. One-off concepts stay inline.
"""
from __future__ import annotations

import re
from pathlib import Path

from .config import config
from .vault import _read_frontmatter, _safe_filename, books_dir

CONCEPT_DIR = "Concepts"
MENTIONS_HEADING = "## mentioned in"
PROMOTE_AT = 2  # a concept needs this many references before it gets its own note

_LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")

CONCEPT_SYSTEM = (
    "You write one short, plain definition for a personal notes glossary. "
    "Given a concept, reply with a single sentence of at most 20 words defining it "
    "simply. No preamble, no quotes, no markdown, just the sentence."
)


def concepts_dir() -> Path:
    return books_dir().parent / CONCEPT_DIR


def _parse_blocks(text: str) -> list[tuple[str, list[str]]]:
    """Return (handle, concepts) for each insight block in a book note."""
    blocks: list[tuple[str, list[str]]] = []
    handle: str | None = None
    buf: list[str] = []

    def flush() -> None:
        nonlocal handle, buf
        if handle is not None:
            concepts = [c.strip() for c in _LINK_RE.findall("\n".join(buf))]
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


def scan_references() -> dict[str, list[tuple[str, str]]]:
    """Map concept (lowercased) -> list of (book note name, handle) across the vault."""
    refs: dict[str, list[tuple[str, str]]] = {}
    d = books_dir()
    if not d.exists():
        return refs
    for p in sorted(d.glob("*.md")):
        text = p.read_text(encoding="utf-8")
        title = _read_frontmatter(p).get("title") or p.stem
        for handle, concepts in _parse_blocks(text):
            for c in concepts:
                refs.setdefault(c.lower(), []).append((title, handle))
    return refs


def _existing_description(path: Path) -> str | None:
    """Pull the description out of an existing concept note so we never overwrite it."""
    if not path.exists():
        return None
    lines = path.read_text(encoding="utf-8").splitlines()
    out: list[str] = []
    for line in lines[1:]:  # skip the "# concept" title line
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


def _render_concept(concept: str, description: str, refs: list[tuple[str, str]]) -> str:
    lines = [f"# {concept}", "", description, "", MENTIONS_HEADING]
    seen: set[tuple[str, str]] = set()
    for book, handle in refs:
        key = (book, handle)
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"- [[{book}]] — {handle}")
    return "\n".join(lines) + "\n"


def sync(concepts: list[str]) -> list[str]:
    """For each saved concept, create/update its note if it now connects (2+ refs)."""
    refs = scan_references()
    cdir = concepts_dir()
    promoted: list[str] = []
    for concept in {c.lower() for c in concepts if c.strip()}:
        hits = refs.get(concept, [])
        unique = list(dict.fromkeys(hits))
        if len(unique) < PROMOTE_AT:
            continue  # one-off: stays an inline link
        cdir.mkdir(parents=True, exist_ok=True)
        path = cdir / f"{_safe_filename(concept)}.md"
        description = _existing_description(path) or define(concept)
        path.write_text(_render_concept(concept, description, unique), encoding="utf-8")
        promoted.append(path.name)
    return promoted
