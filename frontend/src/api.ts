const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export type InsightType = "insight" | "story" | "claim";

export type Insight = {
  type: InsightType;
  title: string;
  body: string;
  concepts: string[];
  verbatim_quote: string | null;
};

export type Book = {
  title: string;
  author: string | null;
  status: string | null;
  tags: string[];
  insightCount: number;
  folder: string;
};

async function asJson(res: Response) {
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function getBooks(): Promise<Book[]> {
  const data = await asJson(await fetch(`${API_BASE}/books`));
  return data.books;
}

export async function compress(
  text: string,
  book: string,
  sessionConcepts: string[],
): Promise<Insight> {
  return asJson(
    await fetch(`${API_BASE}/compress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, book, session_concepts: sessionConcepts }),
    }),
  );
}

export type SessionResult = {
  book: string;
  count: number;
  date: string;
  concept_notes: string[];
};

export async function saveSession(
  book: string,
  insights: Insight[],
  durationMin: number,
  author?: string | null,
  tags?: string[],
): Promise<SessionResult> {
  return asJson(
    await fetch(`${API_BASE}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book,
        insights,
        author: author ?? null,
        tags: tags ?? [],
        duration_min: durationMin,
      }),
    }),
  );
}

export type ReadingSession = {
  date: string;
  book: string;
  insights: number;
  duration: number;
};

export async function getSessions(): Promise<ReadingSession[]> {
  const data = await asJson(await fetch(`${API_BASE}/sessions`));
  return data.sessions;
}
