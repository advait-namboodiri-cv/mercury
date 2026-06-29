import type { SessionBook } from "../App";
import type { Insight } from "../api";
import { ChevronLeft } from "./icons";
import ReviewCard from "./ReviewCard";

type Props = {
  book: SessionBook;
  insights: Insight[];
  saving: boolean;
  onChange: (index: number, insight: Insight) => void;
  onRemove: (index: number) => void;
  onFinalize: () => void;
  onBack: () => void;
};

export default function BatchReview({
  book,
  insights,
  saving,
  onChange,
  onRemove,
  onFinalize,
  onBack,
}: Props) {
  return (
    <div className="window">
      <header className="win-header">
        <div className="mark">
          <span className="mark-dot" />
          <span className="mark-name">Mercury</span>
        </div>
        <div className="context-chip">
          <span className="book">{book.title}</span>
          {book.author && <span className="author">{book.author}</span>}
        </div>
      </header>

      <div className="review-body">
        <div className="review-head">
          <span className="review-eyebrow">Review your reading session</span>
          <span className="review-hint">
            {insights.length} {insights.length === 1 ? "insight" : "insights"} · edit anything
            before it lands
          </span>
        </div>

        {insights.length === 0 ? (
          <p className="subtle" style={{ padding: "40px 0", textAlign: "center" }}>
            No insights left to save. Go back and capture some.
          </p>
        ) : (
          <div className="review-stack">
            {insights.map((insight, i) => (
              <ReviewCard
                key={i}
                insight={insight}
                index={i}
                onChange={(updated) => onChange(i, updated)}
                onRemove={() => onRemove(i)}
              />
            ))}
          </div>
        )}

        <div className="review-actions">
          <button className="back-link" onClick={onBack}>
            <ChevronLeft />
            Keep capturing
          </button>
          <button
            className="btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={onFinalize}
            disabled={insights.length === 0 || saving}
          >
            {saving
              ? "Saving…"
              : `Save reading session · ${insights.length} ${
                  insights.length === 1 ? "insight" : "insights"
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
