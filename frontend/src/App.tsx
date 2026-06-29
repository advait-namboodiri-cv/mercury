import { useCallback, useEffect, useState } from "react";
import { type Book, type Insight, getBooks, saveSession } from "./api";
import BookPicker from "./components/BookPicker";
import NewBookForm from "./components/NewBookForm";
import Capture from "./components/Capture";
import BatchReview from "./components/BatchReview";
import Saved from "./components/Saved";
import Journal from "./components/Journal";

export type SessionBook = {
  title: string;
  author: string | null;
  tags: string[];
  isNew: boolean;
};

type View = "picker" | "newbook" | "capture" | "review" | "saved" | "journal";

export type SavedSummary = {
  book: string;
  count: number;
  concepts: string[];
  duration: number;
};

export default function App() {
  const [view, setView] = useState<View>("picker");
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [book, setBook] = useState<SessionBook | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [session, setSession] = useState<Insight[]>([]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<SavedSummary | null>(null);

  const loadBooks = useCallback(() => {
    getBooks()
      .then((b) => {
        setBooks(b);
        setBooksError(null);
      })
      .catch((e) => setBooksError(String(e.message ?? e)));
  }, []);

  useEffect(loadBooks, [loadBooks]);

  const startSession = (b: SessionBook) => {
    setBook(b);
    setSession([]);
    setStartedAt(Date.now());
    setView("capture");
  };

  const updateInsight = (i: number, insight: Insight) =>
    setSession((s) => s.map((x, j) => (j === i ? insight : x)));
  const removeInsight = (i: number) => setSession((s) => s.filter((_, j) => j !== i));

  const finalize = async () => {
    if (!book || session.length === 0) return;
    setSaving(true);
    try {
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      await saveSession(book.title, session, duration, book.author, book.tags);
      setSummary({
        book: book.title,
        count: session.length,
        concepts: [...new Set(session.flatMap((i) => i.concepts))],
        duration,
      });
      setView("saved");
    } catch (e) {
      alert(`Could not save to your vault: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const toLibrary = () => {
    loadBooks();
    setView("picker");
  };

  return (
    <div className="app">
      {view === "picker" && (
        <BookPicker
          books={books}
          error={booksError}
          onPick={(b) =>
            startSession({ title: b.title, author: b.author, tags: b.tags, isNew: false })
          }
          onNew={() => setView("newbook")}
          onJournal={() => setView("journal")}
        />
      )}

      {view === "newbook" && (
        <NewBookForm
          onStart={(b) => startSession({ ...b, isNew: true })}
          onCancel={() => setView("picker")}
        />
      )}

      {view === "capture" && book && (
        <Capture
          book={book}
          startedAt={startedAt}
          session={session}
          onCapture={(insight) => setSession((s) => [...s, insight])}
          onEnd={() => setView("review")}
          onLibrary={toLibrary}
        />
      )}

      {view === "review" && book && (
        <BatchReview
          book={book}
          insights={session}
          saving={saving}
          onChange={updateInsight}
          onRemove={removeInsight}
          onFinalize={finalize}
          onBack={() => setView("capture")}
        />
      )}

      {view === "saved" && summary && (
        <Saved
          summary={summary}
          onNext={() => book && startSession(book)}
          onLibrary={toLibrary}
        />
      )}

      {view === "journal" && <Journal onLibrary={toLibrary} />}
    </div>
  );
}
