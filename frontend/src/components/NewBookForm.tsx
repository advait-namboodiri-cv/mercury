import { useState } from "react";
import { ChevronLeft, X } from "./icons";

type Props = {
  onStart: (book: { title: string; author: string | null; tags: string[] }) => void;
  onCancel: () => void;
};

export default function NewBookForm({ onStart, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  };

  const start = () => {
    if (!title.trim()) return;
    onStart({ title: title.trim(), author: author.trim() || null, tags });
  };

  return (
    <div className="window">
      <header className="win-header">
        <div className="mark">
          <span className="mark-dot" />
          <span className="mark-name">Mercury</span>
        </div>
        <button className="back-link" onClick={onCancel}>
          <ChevronLeft />
          Library
        </button>
      </header>

      <div className="form-body">
        <h2 className="title-lg">Add a book</h2>
        <p className="subtle" style={{ margin: "8px 0 34px" }}>
          No rush — you can always edit this later.
        </p>

        <label className="eyebrow field-label">Title</label>
        <input
          className="input serif"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Order of Time"
        />

        <label className="eyebrow field-label" style={{ marginTop: 24 }}>
          Author
        </label>
        <input
          className="input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Carlo Rovelli"
        />

        <label className="eyebrow field-label" style={{ marginTop: 24 }}>
          Tags <span className="optional">— optional</span>
        </label>
        <div className="tag-input">
          {tags.map((t) => (
            <span key={t} className="chip">
              {t}
              <span className="x" onClick={() => setTags(tags.filter((x) => x !== t))}>
                <X />
              </span>
            </span>
          ))}
          <input
            className="tag-field"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Add tag…"
          />
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={start} disabled={!title.trim()}>
            Start reflecting
          </button>
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
