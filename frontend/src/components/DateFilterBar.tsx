import type { Dataset } from "../types";
import type { Range } from "../lib/useDateRangeParam";
import { subtractDays } from "../lib/useDateRangeParam";

interface Props {
  range: Range;
  dataset: Dataset;
  onChange: (r: Range) => void;
  onExport?: () => void;
}

const PRESETS = [7, 30, 90] as const;

function activePreset(range: Range, dsTo: string): number | null {
  if (range.to !== dsTo) return null;
  for (const days of PRESETS) {
    if (range.from === subtractDays(dsTo, days - 1)) return days;
  }
  return null;
}

const FORMATTER = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

function formatLabel(from: string, to: string): string {
  if (!from || !to) return "";
  const f = FORMATTER.format(new Date(`${from}T00:00:00Z`));
  const t = FORMATTER.format(new Date(`${to}T00:00:00Z`));
  const days =
    Math.round(
      (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000,
    ) + 1;
  return `Del ${f} al ${t} · ${days} día${days === 1 ? "" : "s"}`;
}

export function DateFilterBar({ range, dataset, onChange, onExport }: Props) {
  if (!range.from || !range.to) return null;
  const dsFrom = dataset.metadata.dateRange.from;
  const dsTo = dataset.metadata.dateRange.to;
  const active = activePreset(range, dsTo);

  function setPreset(days: number) {
    const to = dsTo;
    const from = subtractDays(to, days - 1);
    onChange({ from, to });
  }

  return (
    <div className="rh-filter-bar">
      <div className="rh-filter-inputs">
        <label className="field-label">Desde</label>
        <input
          id="filter-from"
          type="date"
          className="input"
          min={dsFrom}
          max={dsTo}
          value={range.from}
          onChange={(e) => onChange({ ...range, from: e.target.value })}
        />
        <label className="field-label">Hasta</label>
        <input
          id="filter-to"
          type="date"
          className="input"
          min={dsFrom}
          max={dsTo}
          value={range.to}
          onChange={(e) => onChange({ ...range, to: e.target.value })}
        />
      </div>
      <div className="rh-filter-presets">
        {PRESETS.map((days) => (
          <button
            key={days}
            className={`rh-ds-btn${active === days ? " is-active" : ""}`}
            type="button"
            aria-pressed={active === days}
            onClick={() => setPreset(days)}
          >
            {days}d
          </button>
        ))}
      </div>
      <div className="rh-filter-label mono">{formatLabel(range.from, range.to)}</div>
      {onExport && (
        <button
          className="btn"
          type="button"
          onClick={onExport}
          title="Descargar el rango actual como CSV (compatible con Excel)"
        >
          Exportar CSV
        </button>
      )}
    </div>
  );
}
