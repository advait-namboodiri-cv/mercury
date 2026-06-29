import type { Book } from "../api";
import { Plus } from "./icons";

const SPINES = ["#9b82d8", "#b29ae0", "#8a72cf", "#a48ddb", "#9580d4"];

type Props = {
  books: Book[];
  error: string | null;
  onPick: (book: Book) => void;
  onNew: () => void;
  onJournal: () => void;
};

export default function BookPicker({ books, error, onPick, onNew, onJournal }: Props) {
  const totalInsights = books.reduce((n, b) => n + b.insightCount, 0);

  return (
    <div className="window">
      <header className="win-header">
        <div className="mark">
          <span className="mark-dot" />
          <span className="mark-name">Mercury</span>
        </div>
        <div className="header-right">
          <button className="nav-link" onClick={onJournal}>
            Journal
          </button>
          <span className="header-meta">
            {books.length} {books.length === 1 ? "book" : "books"} · {totalInsights} insights
          </span>
        </div>
      </header>

      <div className="picker-body">
        <h2 className="title-xl">What are you reading?</h2>
        <p className="subtle" style={{ margin: "8px 0 28px" }}>
          Choose a book to reflect on, or start a new one.
        </p>

        {error && <p className="picker-error">Couldn't reach your vault — {error}</p>}

        <div className="book-grid">
          {books.map((b, i) => (
            <button key={b.folder} className="book-card" onClick={() => onPick(b)}>
              <span className="spine" style={{ background: SPINES[i % SPINES.length] }} />
              <div className="book-title">{b.title}</div>
              {b.author && <div className="book-author">{b.author}</div>}
              {b.tags.length > 0 && (
                <div className="book-tags">
                  {b.tags.map((t) => (
                    <span key={t} className="chip chip-sm">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="book-count">
                <span className="count-dots">
                  {Array.from({ length: Math.min(b.insightCount, 4) }).map((_, j) => (
                    <span key={j} className="count-dot" />
                  ))}
                </span>
                {b.insightCount} {b.insightCount === 1 ? "insight" : "insights"}
              </div>
            </button>
          ))}

          <button className="new-book-card" onClick={onNew}>
            <span className="new-book-bubble">
              <Plus />
            </span>
            <span className="new-book-label">New book</span>
          </button>
        </div>
      </div>
    </div>
  );
}
