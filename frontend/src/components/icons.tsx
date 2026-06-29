type IconProps = { size?: number; stroke?: string; width?: number };

const base = (size: number, stroke: string, sw: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke,
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const Mic = ({ size = 24, stroke = "#fff", width = 1.6 }: IconProps) => (
  <svg {...base(size, stroke, width)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0" />
    <line x1="12" y1="17" x2="12" y2="20.5" />
    <line x1="8.5" y1="20.5" x2="15.5" y2="20.5" />
  </svg>
);

export const Plus = ({ size = 18, stroke = "#7d61c4", width = 2 }: IconProps) => (
  <svg {...base(size, stroke, width)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const X = ({ size = 11, stroke = "#a48ddb", width = 2.5 }: IconProps) => (
  <svg {...base(size, stroke, width)}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const Check = ({ size = 16, stroke = "#fff", width = 2 }: IconProps) => (
  <svg {...base(size, stroke, width)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ChevronLeft = ({ size = 14, stroke = "#b3a8c2", width = 2 }: IconProps) => (
  <svg {...base(size, stroke, width)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
