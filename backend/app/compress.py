"""Call the local MLX model and parse its output into the strict insight JSON."""
from __future__ import annotations

import json
import re

from .compress_prompt import SYSTEM, user_message
from .model import load

ALLOWED_TYPES = {"story", "insight", "claim"}
MAX_TOKENS = 800
TEMP = 0.3

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)
_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _generate(
    text: str, book: str | None, strict_retry: bool, existing_concepts: list[str] | None
) -> str:
    """Run one generation pass and return the raw model text."""
    from mlx_lm import generate
    from mlx_lm.sample_utils import make_sampler

    model, tokenizer = load()
    messages = [
        {"role": "system", "content": SYSTEM},
        {
            "role": "user",
            "content": user_message(text, book, strict_retry, existing_concepts),
        },
    ]
    try:
        prompt = tokenizer.apply_chat_template(
            messages, add_generation_prompt=True, enable_thinking=False
        )
    except TypeError:
        # older/other tokenizers may not accept enable_thinking
        prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)

    return generate(
        model,
        tokenizer,
        prompt=prompt,
        max_tokens=MAX_TOKENS,
        sampler=make_sampler(temp=TEMP),
        verbose=False,
    )


def _extract_json(raw: str) -> str | None:
    """Pull the first balanced {...} object out of arbitrary model text."""
    s = _THINK_RE.sub("", raw).strip()
    s = _FENCE_RE.sub("", s).strip()

    start = s.find("{")
    if start == -1:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(s)):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return s[start : i + 1]
    return None


def _coerce(obj: dict) -> dict | None:
    """Validate and normalize the parsed object; None if it is unusable."""
    t = str(obj.get("type", "insight")).strip().lower()
    if t not in ALLOWED_TYPES:
        t = "insight"

    title = str(obj.get("title", "")).strip()
    body = str(obj.get("body", "")).strip()
    if not body:
        return None  # an insight with no body is not usable

    concepts = obj.get("concepts") or []
    if isinstance(concepts, str):
        concepts = [concepts]
    concepts = [str(c).strip() for c in concepts if str(c).strip()][:5]

    quote = obj.get("verbatim_quote")
    quote = str(quote).strip() or None if quote is not None else None

    return {
        "type": t,
        "title": title,
        "body": body,
        "concepts": concepts,
        "verbatim_quote": quote,
    }


def _parse(raw: str) -> dict | None:
    block = _extract_json(raw)
    if block is None:
        return None
    try:
        obj = json.loads(block)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    return _coerce(obj)


def compress(
    text: str, book: str | None = None, existing_concepts: list[str] | None = None
) -> dict:
    """Compress a reflection into the strict insight JSON, with one retry.

    existing_concepts is this book's current vocabulary; passing it lets the model
    reuse a fitting concept instead of coining a near-duplicate, so the book's
    graph connects across sessions.
    """
    if not text or not text.strip():
        raise ValueError("reflection text is empty")

    result = _parse(_generate(text, book, False, existing_concepts))
    if result is None:
        result = _parse(_generate(text, book, True, existing_concepts))
    if result is None:
        raise ValueError("model did not return valid JSON after retry")
    return result
