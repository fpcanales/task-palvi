import { useEffect, useState } from "react";
import type { Dataset } from "../types";

export interface Range {
  from: string;
  to: string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Subtract `n` days from an ISO YYYY-MM-DD string. Anchored to UTC to avoid local-tz drift. */
export function subtractDays(iso: string, n: number): string {
  const t = new Date(`${iso}T00:00:00Z`).getTime() - n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Add `n` days to an ISO YYYY-MM-DD string. */
export function addDays(iso: string, n: number): string {
  return subtractDays(iso, -n);
}

function clampRange(range: Range, dsFrom: string, dsTo: string): Range {
  let { from, to } = range;
  if (from > to) [from, to] = [to, from];
  if (from < dsFrom) from = dsFrom;
  if (to > dsTo) to = dsTo;
  return { from, to };
}

function defaultRange(ds: Dataset): Range {
  const to = ds.metadata.dateRange.to;
  const wanted = subtractDays(to, 29);
  const from = wanted < ds.metadata.dateRange.from ? ds.metadata.dateRange.from : wanted;
  return { from, to };
}

function readFromUrl(ds: Dataset): Range {
  const params = new URLSearchParams(window.location.search);
  const f = params.get("from");
  const t = params.get("to");
  if (f && t && ISO_RE.test(f) && ISO_RE.test(t)) {
    const r: Range = { from: f, to: t };
    const clamped = clampRange(r, ds.metadata.dateRange.from, ds.metadata.dateRange.to);
    // Only accept URL range if it was already valid (no clamping applied)
    if (clamped.from === f && clamped.to === t) return clamped;
  }
  return defaultRange(ds);
}

export function useDateRangeParam(dataset: Dataset | null): [Range, (r: Range) => void] {
  const [range, setRangeState] = useState<Range>({ from: "", to: "" });

  // Re-read and validate range whenever dataset changes (covers initial mount + dataset switch)
  useEffect(() => {
    if (!dataset) return;
    const resolved = readFromUrl(dataset);
    // Push resolved range to URL so it self-heals when defaults are applied
    const url = new URL(window.location.href);
    url.searchParams.set("from", resolved.from);
    url.searchParams.set("to", resolved.to);
    window.history.pushState({}, "", url.toString());
    setRangeState(resolved);
    // deps: dataset identity + its bounds (handles dataset switch + bounds change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset?.metadata.id, dataset?.metadata.dateRange.from, dataset?.metadata.dateRange.to]);

  // Listen for browser back/forward navigation and re-sync
  useEffect(() => {
    function onPop() {
      if (dataset) setRangeState(readFromUrl(dataset));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset?.metadata.id]);

  const setRange = (r: Range) => {
    if (!dataset) return;
    const clamped = clampRange(r, dataset.metadata.dateRange.from, dataset.metadata.dateRange.to);
    const url = new URL(window.location.href);
    url.searchParams.set("from", clamped.from);
    url.searchParams.set("to", clamped.to);
    window.history.pushState({}, "", url.toString());
    setRangeState(clamped);
  };

  return [range, setRange];
}
