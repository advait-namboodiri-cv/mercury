import { useState } from "react";
import type { Insight, InsightType } from "../api";
import { Check, Plus, X } from "./icons";

const TYPES: InsightType[] = ["insight", "story", "claim"];

type Props = {
  insight: Insight;
  onKeep: (insight: Insight) => void;
  onDiscard: () => void;
};

export default function ReviewCard({ insight, onKeep, onDiscard }: Props) {
  const [type, setType] = useState<InsightType>(insight.type);
  const [title, setTitle] = useState(insight.title);
  const [body, setBody] = useState(insight.body);
  const [concepts, setConcepts] = useState<string[]>(insight.concepts);
  const [quote, setQuote] = useState(insight.verbatim_quote ?? "");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const addConcept = () => {
    const c = draft.trim().toLowerCase();
    if (c && !concepts.includes(c)) setConcepts([...concepts, c]);
    setDraft("");
    setAdding(false);
  };

  const keep = () =>
    onKeep({
      type,
      title: title.trim(),
      body: body.trim(),
      concepts,
      verbatim_quote: quote.trim() || null,
    });

  return (
    <div className="review">
      <div className="review-head">
        <span className="review-eyebrow">Review your insight</span>
        <span className="review-hint">edit anything before keeping it</span>
      </div>

      <div className="review-card">
        <div className="seg">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`seg-item${t === type ? " active" : ""}`}
              onClick={() => setType(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <input
          className="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="a short handle"
        />

        <textarea
          className="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />

        <div className="review-concepts">
          <div className="eyebrow" style={{ marginBottom: 11 }}>
            Concepts
          </div>
          <div className="concept-row">
            {concepts.map((c) => (
              <span key={c} className="chip">
                {c}
                <span className="x" onClick={() => setConcepts(concepts.filter((x) => x !== c))}>
                  <X />
                </span>
              </span>
            ))}
            {adding ? (
              <input
                className="concept-field"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addConcept();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setDraft("");
                  }
                }}
                onBlur={addConcept}
                placeholder="concept"
              />
            ) : (
              <button className="chip-add" onClick={() => setAdding(true)}>
                <Plus size={11} stroke="#9a85c4" width={2.5} />
                concept
              </button>
            )}
          </div>
        </div>

        <div className="review-quote">
          <div className="eyebrow" style={{ marginBottom: 5 }}>
            Verbatim quote — optional
          </div>
          <textarea
            className="quote-field"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={2}
            placeholder="a direct quote from the book, if any"
          />
        </div>
      </div>

      <div className="review-actions">
        <button className="btn-primary" onClick={keep} disabled={!body.trim()}>
          <Check />
          Keep insight
        </button>
        <button className="btn-ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}
