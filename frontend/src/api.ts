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

export type SaveResult = {
  folder: string;
  file: string;
  created: boolean;
  session: string;
  concept_notes: string[];
};

export async function save(
  book: string,
  insight: Insight,
  author?: string | null,
  tags?: string[],
): Promise<SaveResult> {
  return asJson(
    await fetch(`${API_BASE}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, insight, author: author ?? null, tags: tags ?? [] }),
    }),
  );
}
