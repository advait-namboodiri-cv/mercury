import { useState } from "react";
import type { SessionBook } from "../App";
import { type Insight, compress } from "../api";
import { ChevronLeft, Check, Mic } from "./icons";
import Stopwatch from "./Stopwatch";

type Phase = "compose" | "compressing";
type Mode = "speak" | "type";

type Props = {
  book: SessionBook;
  startedAt: number;
  session: Insight[];
  onCapture: (insight: Insight) => void;
  onEnd: () => void;
  onLibrary: () => void;
};

export default function Capture({
  book,
  startedAt,
  session,
  onCapture,
  onEnd,
  onLibrary,
}: Props) {
  const [mode, setMode] = useState<Mode>("type");
  const [phase, setPhase] = useState<Phase>("compose");
  const [draft, setDraft] = useState("");
  const [banner, setBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const count = session.length;
  const sessionConcepts = session.flatMap((i) => i.concepts);

  const runCompress = async () => {
    if (!draft.trim()) return;
    setPhase("compressing");
    setError(null);
    try {
      const insight = await compress(draft, book.title, sessionConcepts);
      onCapture(insight);
      setDraft("");
      setPhase("compose");
      setBanner(true);
      setTimeout(() => setBanner(false), 2600);
    } catch (e) {
      setError((e as Error).message);
      setPhase("compose");
    }
  };

  const leave = () => {
    if (
      count > 0 &&
      !confirm("Leave without ending the session? Captured insights won't be saved.")
    ) {
      return;
    }
    onLibrary();
  };

  return (
    <div className="window">
      <header className="win-header">
        <div className="mark">
          <span className="mark-dot" />
          <span className="mark-name">Mercury</span>
        </div>
        <div className="header-right">
          <Stopwatch startedAt={startedAt} />
          <div className="context-chip">
            <span className="book">{book.title}</span>
            {book.author && <span className="author">{book.author}</span>}
          </div>
        </div>
      </header>

      <div className="capture-body">
        <div className="capture-modes">
          <div className="seg">
            <button
              className={`seg-item${mode === "speak" ? " active" : ""}`}
              onClick={() => setMode("speak")}
            >
              <Mic size={14} stroke={mode === "speak" ? "#5b4a86" : "#9a90a6"} width={1.8} />
              Speak
            </button>
            <button
              className={`seg-item${mode === "type" ? " active" : ""}`}
              onClick={() => setMode("type")}
            >
              Type
            </button>
          </div>
          {banner && (
            <div className="saved-banner">
              <span className="saved-banner-check">
                <Check size={13} stroke="#7d61c4" width={2.2} />
              </span>
              insight saved · review at end of session
            </div>
          )}
        </div>

        {phase === "compressing" ? (
          <div className="compressing">
            <div className="dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <div className="compressing-label">Compressing your insight…</div>
            <p className="subtle">distilling your thought into something clear</p>
          </div>
        ) : mode === "speak" ? (
          <div className="mic-stage">
            <div className="mic-orb-wrap">
              <span className="halo" />
              <span className="halo halo-2" />
              <span className="mic-orb">
                <Mic size={40} />
              </span>
            </div>
            <p className="subtle" style={{ textAlign: "center", maxWidth: 320 }}>
              Voice capture is coming soon. For now, switch to <b>Type</b> to capture this insight.
            </p>
          </div>
        ) : (
          <div className="compose-card">
            <textarea
              className="compose-field"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What struck you? Say one thought — ramble as much as you like."
            />
            <div className="compose-foot">
              <span>{words} words</span>
              <span className="compose-meta">insight {count + 1} of this session</span>
            </div>
          </div>
        )}

        {error && <p className="picker-error">Couldn't compress — {error}</p>}

        {phase === "compose" && (
          <div className="capture-foot">
            <button className="back-link" onClick={leave}>
              <ChevronLeft />
              Library
            </button>
            <span className="session-counter">
              <span className="counter-dots">
                {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                  <span key={i} className="counter-dot" />
                ))}
              </span>
              {count} {count === 1 ? "insight" : "insights"} this session
            </span>
            <div className="foot-actions">
              <button
                className="btn-primary"
                onClick={runCompress}
                disabled={mode === "speak" || !draft.trim()}
              >
                Compress
              </button>
              <button className="btn-ghost" onClick={onEnd} disabled={count === 0}>
                End reading session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
