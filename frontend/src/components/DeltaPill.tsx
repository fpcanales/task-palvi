import type { Sentiment } from "../types";

interface Props {
  pct: number | null;
  sentiment: Sentiment;
  compact?: boolean;
  vsLabel?: string;
}

export function DeltaPill({ pct, sentiment, compact = false, vsLabel = "vs sem. ant." }: Props) {
  if (pct == null) return <span className="delta-pill neutral">—</span>;
  const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "·";
  const mag = Math.abs(pct);
  const magStr =
    mag >= 100 ? Math.round(mag) + "%" : mag >= 10 ? mag.toFixed(0) + "%" : mag.toFixed(1) + "%";
  return (
    <span className={`delta-pill ${sentiment}`}>
      <span className="arrow">{arrow}</span>
      {magStr}
      {!compact && <span className="vs"> {vsLabel}</span>}
    </span>
  );
}
