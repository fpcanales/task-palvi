import { useEffect, useMemo, useState } from "react";

import { api } from "./api/client";
import { AlarmForm } from "./components/AlarmForm";
import { DateFilterBar } from "./components/DateFilterBar";
import { FocusToday } from "./components/FocusToday";
import { Funnel } from "./components/Funnel";
import { Header } from "./components/Header";
import { KPIGrid } from "./components/KPIGrid";
import { RulesManager } from "./components/RulesManager";
import { SupportSection } from "./components/SupportSection";
import { exportSliceToCsv } from "./lib/exportCsv";
import { useDatasetParam } from "./lib/useDatasetParam";
import { useDateRangeParam, subtractDays } from "./lib/useDateRangeParam";
import { useViewParam } from "./lib/useViewParam";
import {
  aggregateSlice,
  buildFunnelFromSlices,
  deltaSentiment,
  latest,
  periodDeltaSlice,
  sliceByRange,
} from "./lib/metricUtils";
import type { Alarm, AlarmInput, Dataset, DatasetListItem, KPI } from "./types";

const KPI_KEYS = [
  "avg_response_time_min",
  "deals_won",
  "leads_qualified",
  "deals_created",
  "stale_deals",
  "leads_created",
  "avg_deal_cycle_days",
  "deals_lost",
];

function urgencySort(kpis: KPI[]): KPI[] {
  const rank: Record<KPI["sentiment"], number> = { bad: 0, neutral: 1, good: 2 };
  return [...kpis].sort((a, b) => {
    const r = rank[a.sentiment] - rank[b.sentiment];
    if (r !== 0) return r;
    return Math.abs(b.weekDeltaPct ?? 0) - Math.abs(a.weekDeltaPct ?? 0);
  });
}

/** Read the ?dataset= param from the current URL once, before datasets load. */
function readInitialDatasetId(): string {
  return new URLSearchParams(window.location.search).get("dataset") ?? "A";
}

export function App() {
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [cache, setCache] = useState<Map<string, Dataset>>(new Map());
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [creating, setCreating] = useState(false);

  const [activeId, setActiveId] = useDatasetParam(datasets.map((d) => d.id));
  const [view, setView] = useViewParam();
  const [range, setRange] = useDateRangeParam(activeDataset);

  // Cache-aware dataset loader: serves from cache on hit, fetches and caches on miss.
  async function loadDataset(id: string) {
    if (cache.has(id)) {
      setActiveDataset(cache.get(id)!);
      return;
    }
    setSwitching(true);
    try {
      const ds = await api.getDataset(id);
      setCache((prev) => new Map(prev).set(id, ds));
      setActiveDataset(ds);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSwitching(false);
    }
  }

  // Alarm loader: fetches alarms enriched with triggered/current_value filtered to `to` date.
  async function loadAlarms(id: string, to?: string) {
    try {
      const al = await api.listAlarms(id, to);
      setAlarms(al);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Initial load: fetch dataset list and initial dataset in parallel.
  // Alarms are loaded separately by the [activeId, range.to] effect once range resolves.
  useEffect(() => {
    let cancelled = false;
    const initialId = readInitialDatasetId();
    Promise.all([api.listDatasets(), api.getDataset(initialId)])
      .then(([list, ds]) => {
        if (cancelled) return;
        setDatasets(list);
        setCache(new Map([[ds.metadata.id, ds]]));
        setActiveDataset(ds);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // When activeId changes (switcher click or browser back/forward), load dataset.
  // Alarm refetch is handled by the [activeId, range.to] effect below.
  useEffect(() => {
    if (!activeDataset) return; // still on initial load — handled above
    if (activeDataset.metadata.id !== activeId) {
      loadDataset(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Refetch alarms whenever the active dataset or the range `to` boundary changes.
  // A change to `from` alone does NOT trigger a refetch (NFR-2).
  useEffect(() => {
    if (activeDataset && range.to) {
      loadAlarms(activeId, range.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, range.to]);

  // Slice the active dataset's days to the selected range
  const curSlice = useMemo(
    () =>
      activeDataset && range.from && range.to
        ? sliceByRange(activeDataset.days, range.from, range.to)
        : [],
    [activeDataset, range.from, range.to],
  );

  // Compute the prior period: same length, ending the day before `from`
  const priorSlice = useMemo(() => {
    if (!activeDataset || !curSlice.length || !range.from) return [];
    const len = curSlice.length;
    const priorTo = subtractDays(range.from, 1);
    const priorFrom = subtractDays(priorTo, len - 1);
    return sliceByRange(activeDataset.days, priorFrom, priorTo);
  }, [activeDataset, range.from, curSlice.length]);

  // buildKpi is a closure over the current slices — do NOT hoist to module level
  function buildKpi(key: string): KPI {
    const meta = activeDataset!.metadata.metrics.find((m) => m.key === key);
    if (!meta) throw new Error(`Unknown metric ${key}`);
    const cur = aggregateSlice(curSlice, key, "mean") ?? latest(activeDataset!, key);
    const delta = periodDeltaSlice(curSlice, priorSlice, key, "mean");
    const sentiment = delta ? deltaSentiment(meta.direction, delta.pct, 1.5) : "neutral";
    const spark = curSlice.map((d) => d.values[key] ?? null);
    return {
      key,
      label: meta.label,
      unit: meta.unit,
      direction: meta.direction,
      current: cur,
      weekDeltaPct: delta ? delta.pct : null,
      prior: delta ? delta.prior : null,
      sentiment,
      spark,
    };
  }

  const kpis = useMemo(() => {
    if (!activeDataset) return [];
    return urgencySort(KPI_KEYS.map((k) => buildKpi(k)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset, curSlice, priorSlice]);

  const funnel = useMemo(
    () => buildFunnelFromSlices(curSlice, priorSlice),
    [curSlice, priorSlice],
  );
  const supportTickets = useMemo(
    () => (activeDataset ? buildKpi("support_tickets_opened") : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDataset, curSlice, priorSlice],
  );
  const supportResolution = useMemo(
    () => (activeDataset ? buildKpi("support_avg_resolution_hours") : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDataset, curSlice, priorSlice],
  );

  async function handleCreate(payload: AlarmInput) {
    const next = { ...payload, position: alarms.length };
    await api.createAlarm(next);
    await loadAlarms(activeId, range.to);
    setCreating(false);
  }

  async function handleUpdate(payload: AlarmInput) {
    if (!editing) return;
    await api.updateAlarm(editing.id, payload);
    await loadAlarms(activeId, range.to);
    setEditing(null);
  }

  // With confirmation — used by FocusToday cards.
  async function handleDelete(alarm: Alarm) {
    if (!confirm(`¿Eliminar "${alarm.title}"?`)) return;
    await api.deleteAlarm(alarm.id);
    await loadAlarms(activeId, range.to);
  }

  // Without confirmation — RulesManager handles its own confirm before calling this.
  async function handleDeleteDirect(alarm: Alarm) {
    await api.deleteAlarm(alarm.id);
    await loadAlarms(activeId, range.to);
  }

  if (loading) return <div className="loading">Cargando reporte…</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!activeDataset || !supportTickets || !supportResolution)
    return <div className="error">Sin datos disponibles.</div>;

  const rangeDays = curSlice.length;
  const kpiSubtitle = `Estado actual · ${rangeDays} días · delta vs período anterior`;
  const funnelSubtitle =
    priorSlice.length > 0
      ? `Últimos ${rangeDays} días vs ${priorSlice.length} días anteriores`
      : `Últimos ${rangeDays} días`;

  return (
    <div className={`rh-app${switching ? " rh-app--switching" : ""}`}>
      <Header
        dataset={activeDataset}
        datasets={datasets}
        activeId={activeId}
        onSwitch={setActiveId}
        view={view}
        onViewChange={setView}
      />
      <DateFilterBar
        range={range}
        dataset={activeDataset}
        onChange={setRange}
        onExport={() => exportSliceToCsv(activeDataset, curSlice, range)}
      />
      {view === "rules" ? (
        <RulesManager
          alarms={alarms}
          metrics={activeDataset.metadata.metrics}
          dataset={activeDataset}
          onCreate={() => setCreating(true)}
          onEdit={(a) => setEditing(a)}
          onDelete={handleDeleteDirect}
        />
      ) : (
        <main className="rh-main">
          <FocusToday
            alarms={alarms}
            dataset={activeDataset}
            onCreate={() => setCreating(true)}
            onEdit={(a) => setEditing(a)}
            onDelete={handleDelete}
          />
          <Funnel funnel={funnel} subtitle={funnelSubtitle} />
          <KPIGrid kpis={kpis} subtitle={kpiSubtitle} vsLabel="vs período anterior" />
          <SupportSection
            tickets={supportTickets}
            resolution={supportResolution}
            vsLabel="vs período anterior"
            priorWindowDays={priorSlice.length}
          />
        </main>
      )}

      {creating && (
        <AlarmForm
          metrics={activeDataset.metadata.metrics}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          eyebrow={view === "rules" ? "Reglas" : "Foco de hoy"}
        />
      )}
      {editing && (
        <AlarmForm
          initial={editing}
          metrics={activeDataset.metadata.metrics}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
          eyebrow={view === "rules" ? "Reglas" : "Foco de hoy"}
        />
      )}
    </div>
  );
}
