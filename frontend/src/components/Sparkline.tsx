import { sparkPath } from "../lib/metricUtils";
import type { Sentiment } from "../types";

interface Props {
  values: (number | null)[];
  width?: number;
  height?: number;
  sentiment?: Sentiment;
  strokeWidth?: number;
}

export function Sparkline({
  values,
  width = 96,
  height = 28,
  sentiment = "neutral",
  strokeWidth = 1.5,
}: Props) {
  const path = sparkPath(values, width, height);

  const last = (() => {
    const valid = values.filter((v): v is number => v != null);
    if (!valid.length) return null;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const step = (width - 4) / (values.length - 1);
    const lastIdx = values.length - 1;
    const v = values[lastIdx] ?? valid[valid.length - 1];
    if (v == null) return null;
    return { x: 2 + lastIdx * step, y: 2 + (height - 4) - ((v - min) / range) * (height - 4) };
  })();

  const color =
    sentiment === "good" ? "var(--good)" : sentiment === "bad" ? "var(--bad)" : "var(--ink-3)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && <circle cx={last.x} cy={last.y} r={2.2} fill={color} />}
    </svg>
  );
}
