import { useEffect, useState } from "react";
import { type ReadingSession, getSessions } from "../api";
import { ChevronLeft } from "./icons";

export default function Journal({ onLibrary }: { onLibrary: () => void }) {
  const [sessions, setSessions] = useState<ReadingSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const totalInsights = sessions?.reduce((n, s) => n + s.insights, 0) ?? 0;

  return (
    <div className="window">
      <header className="win-header">
        <div className="mark">
          <span className="mark-dot" />
          <span className="mark-name">Mercury</span>
        </div>
        <button className="back-link" onClick={onLibrary}>
          <ChevronLeft />
          Library
        </button>
      </header>

      <div className="picker-body">
        <h2 className="title-xl">Reading sessions</h2>
        <p className="subtle" style={{ margin: "8px 0 28px" }}>
          {sessions && sessions.length > 0
            ? `${sessions.length} sessions · ${totalInsights} insights gathered`
            : "Every reading session you've finished lands here."}
        </p>

        {error && <p className="picker-error">Couldn't load the journal — {error}</p>}

        {sessions && sessions.length === 0 && (
          <p className="subtle" style={{ padding: "32px 0" }}>
            No reading sessions yet. Pick a book and capture your first insights.
          </p>
        )}

        {sessions && sessions.length > 0 && (
          <div className="journal-list">
            {sessions.map((s, i) => (
              <div key={i} className="journal-row">
                <div className="journal-main">
                  <span className="journal-book">{s.book}</span>
                  <span className="journal-date">{s.date}</span>
                </div>
                <div className="journal-meta">
                  <span>
                    {s.insights} {s.insights === 1 ? "insight" : "insights"}
                  </span>
                  <span className="journal-dot" />
                  <span>{s.duration} min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
