import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

type Health = {
  status: string;
  model: {
    framework: string;
    model: string;
    mlx_available: boolean;
    model_cached: boolean;
    loaded: boolean;
  };
  vault: { path: string | null; exists: boolean };
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="wrap">
      <h1>mercury</h1>
      <p className="tagline">book reflections, compressed into your vault</p>

      <section className="card">
        <h2>health</h2>
        {error && <p className="bad">backend unreachable — {error}</p>}
        {!health && !error && <p className="muted">checking…</p>}
        {health && (
          <ul className="status">
            <Row label="backend" ok={health.status === "ok"} value={health.status} />
            <Row label="mlx" ok={health.model.mlx_available} value={health.model.framework} />
            <Row
              label="model"
              ok={health.model.model_cached}
              value={`${health.model.model} ${health.model.model_cached ? "(cached)" : "(not downloaded)"}`}
            />
            <Row
              label="vault"
              ok={health.vault.exists}
              value={health.vault.path ?? "not set"}
            />
          </ul>
        )}
      </section>
    </main>
  );
}

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <li>
      <span className={ok ? "dot good" : "dot bad"} />
      <span className="key">{label}</span>
      <span className="val">{value}</span>
    </li>
  );
}
