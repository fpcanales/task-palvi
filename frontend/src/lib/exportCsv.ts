import type { Dataset, DayValues } from "../types";

function escapeCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportSliceToCsv(
  dataset: Dataset,
  slice: DayValues[],
  rangeLabel: { from: string; to: string },
): void {
  const metrics = dataset.metadata.metrics;
  const headers = ["date", ...metrics.map((m) => m.key)];
  const rows = slice.map((d) => [d.date, ...metrics.map((m) => d.values[m.key] ?? null)]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `palvi-${dataset.metadata.id}-${rangeLabel.from}_${rangeLabel.to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
