import type { Dataset, DayValues, Direction, FunnelStage, Sentiment } from "../types";

export function tail(dataset: Dataset, key: string, n: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = dataset.days.length - n; i < dataset.days.length; i++) {
    out.push(dataset.days[i]?.values[key] ?? null);
  }
  return out;
}

export function latest(dataset: Dataset, key: string): number | null {
  for (let i = dataset.days.length - 1; i >= 0; i--) {
    const v = dataset.days[i].values[key];
    if (v != null) return v;
  }
  return null;
}

export function aggregate(
  dataset: Dataset,
  key: string,
  n: number,
  mode: "mean" | "sum" = "mean",
): number | null {
  const slice = tail(dataset, key, n).filter((v): v is number => v != null);
  if (!slice.length) return null;
  const sum = slice.reduce((a, b) => a + b, 0);
  return mode === "sum" ? sum : sum / slice.length;
}

export function periodDelta(
  dataset: Dataset,
  key: string,
  period = 7,
  mode: "mean" | "sum" = "mean",
): { current: number; prior: number; abs: number; pct: number | null } | null {
  const N = dataset.days.length;
  const cur = dataset.days.slice(N - period);
  const prev = dataset.days.slice(N - period * 2, N - period);
  const c = cur.map((d) => d.values[key]).filter((v): v is number => v != null);
  const p = prev.map((d) => d.values[key]).filter((v): v is number => v != null);
  if (!c.length || !p.length) return null;
  const fold = (xs: number[]) =>
    mode === "sum" ? xs.reduce((a, b) => a + b, 0) : xs.reduce((a, b) => a + b, 0) / xs.length;
  const cMean = fold(c);
  const pMean = fold(p);
  const abs = cMean - pMean;
  const pct = pMean === 0 ? null : (abs / pMean) * 100;
  return { current: cMean, prior: pMean, abs, pct };
}

export function sparkPath(values: (number | null)[], width: number, height: number, pad = 2): string {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return "";
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / (values.length - 1);
  let d = "";
  let started = false;
  values.forEach((v, i) => {
    if (v == null) {
      started = false;
      return;
    }
    const x = pad + i * step;
    const y = pad + h - ((v - min) / range) * h;
    d += (started ? " L " : "M ") + x.toFixed(1) + " " + y.toFixed(1);
    started = true;
  });
  return d;
}

export function deltaSentiment(direction: Direction, pct: number | null, threshold = 1): Sentiment {
  if (pct == null || Math.abs(pct) < threshold) return "neutral";
  const improving = pct > 0;
  if (direction === "higher_is_better") return improving ? "good" : "bad";
  return improving ? "bad" : "good";
}

export function fmt(value: number | null | undefined, unit?: string): string {
  if (value == null) return "—";
  if (unit === "min" || unit === "hr") {
    if (value >= 100) return Math.round(value).toLocaleString();
    if (value >= 10) return value.toFixed(0);
    return value.toFixed(1);
  }
  if (unit === "days") return value.toFixed(1);
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  if (Math.abs(value) >= 100) return Math.round(value).toString();
  if (Math.abs(value) >= 10) return value.toFixed(0);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildFunnel(dataset: Dataset): FunnelStage[] {
  const stages = [
    { key: "traffic", label: "Traffic" },
    { key: "leads_created", label: "Leads" },
    { key: "leads_qualified", label: "Qualified" },
    { key: "deals_created", label: "Deals" },
    { key: "deals_won", label: "Won" },
  ];
  const period = 7;
  const N = dataset.days.length;

  const sumPrev = (key: string) =>
    dataset.days
      .slice(N - period * 2, N - period)
      .map((d) => d.values[key])
      .filter((v): v is number => v != null)
      .reduce((a, b) => a + b, 0);

  return stages.map((s, i) => {
    const cur = aggregate(dataset, s.key, period, "sum");
    const prev = sumPrev(s.key);
    let convCur: number | null = null;
    let convPrev: number | null = null;
    let convDeltaPct: number | null = null;
    if (i > 0 && cur != null) {
      const prevStage = stages[i - 1];
      const prevCur = aggregate(dataset, prevStage.key, period, "sum") ?? 0;
      const prevPrev = sumPrev(prevStage.key);
      if (prevCur > 0) convCur = (cur / prevCur) * 100;
      if (prevPrev > 0) convPrev = (prev / prevPrev) * 100;
      if (convCur != null && convPrev != null && convPrev !== 0) {
        convDeltaPct = ((convCur - convPrev) / convPrev) * 100;
      }
    }
    return {
      ...s,
      value: cur,
      prior: prev,
      valueDeltaPct: prev > 0 && cur != null ? ((cur - prev) / prev) * 100 : null,
      conversionFromPrev: convCur,
      conversionPrior: convPrev,
      conversionDeltaPct: convDeltaPct,
    };
  });
}

export function findBottleneck(funnel: FunnelStage[]): string | null {
  let worst: FunnelStage | null = null;
  for (let i = 1; i < funnel.length; i++) {
    const s = funnel[i];
    if (s.conversionDeltaPct == null) continue;
    if (!worst || s.conversionDeltaPct < (worst.conversionDeltaPct ?? 0)) worst = s;
  }
  if (worst && (worst.conversionDeltaPct ?? 0) < -3) return worst.key;
  return null;
}

// ---------------------------------------------------------------------------
// Slice-based API (date-range aware) — additive alongside the legacy count-based API.
// These functions operate on DayValues[] slices already filtered by range.
// ---------------------------------------------------------------------------

export function sliceByRange(days: DayValues[], from: string, to: string): DayValues[] {
  return days.filter((d) => d.date >= from && d.date <= to);
}

export function aggregateSlice(
  slice: DayValues[],
  key: string,
  mode: "mean" | "sum" = "mean",
): number | null {
  const vals = slice.map((d) => d.values[key]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return mode === "sum" ? sum : sum / vals.length;
}

export function periodDeltaSlice(
  curSlice: DayValues[],
  priorSlice: DayValues[],
  key: string,
  mode: "mean" | "sum" = "mean",
): { current: number | null; prior: number | null; abs: number | null; pct: number | null } | null {
  const cur = aggregateSlice(curSlice, key, mode);
  const prior = aggregateSlice(priorSlice, key, mode);
  if (cur == null && prior == null) return null;
  if (prior == null) return { current: cur, prior: null, abs: null, pct: null };
  if (cur == null) return { current: null, prior, abs: null, pct: null };
  const abs = cur - prior;
  const pct = prior === 0 ? null : (abs / prior) * 100;
  return { current: cur, prior, abs, pct };
}

export function buildFunnelFromSlices(
  curSlice: DayValues[],
  priorSlice: DayValues[],
): FunnelStage[] {
  const stages = [
    { key: "traffic", label: "Traffic" },
    { key: "leads_created", label: "Leads" },
    { key: "leads_qualified", label: "Qualified" },
    { key: "deals_created", label: "Deals" },
    { key: "deals_won", label: "Won" },
  ];
  return stages.map((s, i) => {
    const cur = aggregateSlice(curSlice, s.key, "sum");
    const prior = aggregateSlice(priorSlice, s.key, "sum") ?? 0;
    let convCur: number | null = null;
    let convPrev: number | null = null;
    let convDeltaPct: number | null = null;
    if (i > 0 && cur != null) {
      const prev = stages[i - 1];
      const prevCur = aggregateSlice(curSlice, prev.key, "sum") ?? 0;
      const prevPrev = aggregateSlice(priorSlice, prev.key, "sum") ?? 0;
      if (prevCur > 0) convCur = (cur / prevCur) * 100;
      if (prevPrev > 0) convPrev = (prior / prevPrev) * 100;
      if (convCur != null && convPrev != null && convPrev !== 0) {
        convDeltaPct = ((convCur - convPrev) / convPrev) * 100;
      }
    }
    return {
      ...s,
      value: cur,
      prior,
      valueDeltaPct: prior > 0 && cur != null ? ((cur - prior) / prior) * 100 : null,
      conversionFromPrev: convCur,
      conversionPrior: convPrev,
      conversionDeltaPct: convDeltaPct,
    };
  });
}
