import type { SavedSummary } from "../App";
import { Check } from "./icons";

type Props = {
  summary: SavedSummary;
  onNext: () => void;
  onLibrary: () => void;
};

const NODE_FILLS = ["#b9a6e2", "#a98fe0", "#cdbcec", "#9b82d8", "#b29ae0", "#a48ddb"];

export default function Saved({ summary, onNext, onLibrary }: Props) {
  const concepts = summary.concepts.slice(0, 8);
  const cx = 280;
  const cy = 300;
  const radius = 175;

  const nodes = concepts.map((name, i) => {
    const angle = (i / Math.max(concepts.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      name,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      r: 7 + ((i * 2) % 4),
      fill: NODE_FILLS[i % NODE_FILLS.length],
    };
  });

  return (
    <div className="window saved">
      <div className="saved-left">
        <div className="mark">
          <span className="mark-dot" />
          <span className="mark-name">Mercury</span>
        </div>

        <div className="saved-center">
          <span className="saved-check">
            <Check size={30} stroke="#7d61c4" width={2.2} />
          </span>
          <h2 className="title-lg" style={{ marginTop: 22 }}>
            Saved.
          </h2>
          <p className="saved-text">
            {summary.count === 1 ? "Your insight" : `Your ${summary.count} insights`} joined{" "}
            <em>{summary.book}</em>
            {summary.concepts.length > 0 &&
              ` — ${summary.concepts.length} ${
                summary.concepts.length === 1 ? "concept" : "concepts"
              } linked into its graph.`}
          </p>
          <div className="vault-pill">
            <span className="vault-dot" />
            written to Obsidian vault
          </div>
        </div>

        <div className="saved-actions">
          <button className="btn-primary" onClick={onNext}>
            Next reading session
          </button>
          <button className="btn-ghost" onClick={onLibrary}>
            Library
          </button>
        </div>
      </div>

      <div className="saved-graph">
        <div className="graph-eyebrow">Concept graph — {summary.book}</div>
        <svg viewBox="0 0 560 600" className="graph-svg">
          {nodes.map((n, i) => (
            <line
              key={`l-${i}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke="#cdbcec"
              strokeWidth={1.6}
              strokeDasharray={60}
              style={{ animation: `link 1.1s ease ${0.2 + i * 0.15}s both` }}
            />
          ))}
          <circle
            cx={cx}
            cy={cy}
            r={13}
            fill="#7d61c4"
            style={{ animation: "node .6s ease .1s both" }}
          />
          {nodes.map((n, i) => (
            <circle
              key={`n-${i}`}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.fill}
              style={{ animation: `node .6s ease ${0.4 + i * 0.15}s both` }}
            />
          ))}
          {nodes.map((n, i) => (
            <text
              key={`t-${i}`}
              x={n.x}
              y={n.y - n.r - 8}
              textAnchor="middle"
              fontFamily="Hanken Grotesk"
              fontSize={12}
              fill="#7a6e8c"
            >
              {n.name}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
