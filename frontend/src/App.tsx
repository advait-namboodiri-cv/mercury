import { useCallback, useEffect, useState } from "react";
import { type Book, type Insight, getBooks, save } from "./api";
import BookPicker from "./components/BookPicker";
import NewBookForm from "./components/NewBookForm";
import Capture from "./components/Capture";
import Saved from "./components/Saved";

export type SessionBook = {
  title: string;
  author: string | null;
  tags: string[];
  isNew: boolean;
};

type View = "picker" | "newbook" | "capture" | "saved";

export type SavedSummary = { book: string; count: number; concepts: string[] };

export default function App() {
  const [view, setView] = useState<View>("picker");
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [book, setBook] = useState<SessionBook | null>(null);
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
    setView("capture");
  };

  const endSession = async () => {
    if (!book || session.length === 0) return;
    setSaving(true);
    try {
      for (const insight of session) {
        await save(book.title, insight, book.author, book.tags);
      }
      const concepts = [...new Set(session.flatMap((i) => i.concepts))];
      setSummary({ book: book.title, count: session.length, concepts });
      setView("saved");
    } catch (e) {
      alert(`Could not save to your vault: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
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
          session={session}
          saving={saving}
          onKeep={(insight) => setSession((s) => [...s, insight])}
          onEndSession={endSession}
          onLibrary={() => {
            loadBooks();
            setView("picker");
          }}
        />
      )}

      {view === "saved" && summary && (
        <Saved
          summary={summary}
          onNext={() => book && startSession(book)}
          onLibrary={() => {
            loadBooks();
            setView("picker");
          }}
        />
      )}
    </div>
  );
}
