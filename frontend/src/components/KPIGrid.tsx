import { fmt } from "../lib/metricUtils";
import type { KPI } from "../types";
import { DeltaPill } from "./DeltaPill";
import { SectionHeader } from "./SectionHeader";
import { Sparkline } from "./Sparkline";

interface Props {
  kpis: KPI[];
  subtitle?: string;
  vsLabel?: string;
}

export function KPIGrid({
  kpis,
  subtitle = "Estado actual · tendencia 30d · delta vs semana anterior",
  vsLabel,
}: Props) {
  return (
    <section className="rh-section">
      <SectionHeader
        eyebrow="03"
        title="KPIs comerciales"
        sub={subtitle}
      />
      <div className="rh-kpi-grid">
        {kpis.map((k) => (
          <KPICard key={k.key} kpi={k} vsLabel={vsLabel} />
        ))}
      </div>
    </section>
  );
}

function KPICard({ kpi, vsLabel }: { kpi: KPI; vsLabel?: string }) {
  return (
    <div className={`rh-kpi-card sentiment-${kpi.sentiment}`}>
      <div className="rh-kpi-head">
        <span className="rh-kpi-label">{kpi.label}</span>
        <span className={`rh-kpi-traffic-light tl-${kpi.sentiment}`} aria-hidden="true" />
      </div>
      <div className="rh-kpi-value-row">
        <div className="rh-kpi-value">
          {fmt(kpi.current, kpi.unit)}
          <span className="rh-kpi-unit">{kpi.unit}</span>
        </div>
      </div>
      <div className="rh-kpi-spark">
        <Sparkline values={kpi.spark} width={180} height={36} sentiment={kpi.sentiment} />
      </div>
      <div className="rh-kpi-foot">
        <DeltaPill pct={kpi.weekDeltaPct} sentiment={kpi.sentiment} vsLabel={vsLabel} />
      </div>
    </div>
  );
}
