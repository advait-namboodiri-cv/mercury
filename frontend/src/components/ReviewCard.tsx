import { useState } from "react";
import type { Insight, InsightType } from "../api";
import { Plus, X } from "./icons";

const TYPES: InsightType[] = ["insight", "story", "claim"];

type Props = {
  insight: Insight;
  index: number;
  onChange: (insight: Insight) => void;
  onRemove: () => void;
};

export default function ReviewCard({ insight, index, onChange, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const update = (partial: Partial<Insight>) => onChange({ ...insight, ...partial });

  const addConcept = () => {
    const c = draft.trim().toLowerCase();
    if (c && !insight.concepts.includes(c)) update({ concepts: [...insight.concepts, c] });
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="review-card">
      <div className="review-card-top">
        <span className="review-index">Insight {index + 1}</span>
        <button className="review-remove" onClick={onRemove} title="Remove this insight">
          <X size={13} stroke="#b3a8c2" width={2} />
        </button>
      </div>

      <div className="seg">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`seg-item${t === insight.type ? " active" : ""}`}
            onClick={() => update({ type: t })}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <input
        className="review-title"
        value={insight.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="a short handle"
      />

      <textarea
        className="review-body"
        value={insight.body}
        onChange={(e) => update({ body: e.target.value })}
        rows={4}
      />

      <div className="review-concepts">
        <div className="eyebrow" style={{ marginBottom: 11 }}>
          Concepts
        </div>
        <div className="concept-row">
          {insight.concepts.map((c) => (
            <span key={c} className="chip">
              {c}
              <span
                className="x"
                onClick={() => update({ concepts: insight.concepts.filter((x) => x !== c) })}
              >
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
          value={insight.verbatim_quote ?? ""}
          onChange={(e) => update({ verbatim_quote: e.target.value || null })}
          rows={2}
          placeholder="a direct quote from the book, if any"
        />
      </div>
    </div>
  );
}
