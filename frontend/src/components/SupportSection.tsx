import { fmt } from "../lib/metricUtils";
import type { KPI } from "../types";
import { DeltaPill } from "./DeltaPill";
import { SectionHeader } from "./SectionHeader";
import { Sparkline } from "./Sparkline";

interface Props {
  tickets: KPI;
  resolution: KPI;
  vsLabel?: string;
  priorWindowDays?: number;
}

export function SupportSection({ tickets, resolution, vsLabel, priorWindowDays }: Props) {
  return (
    <section className="rh-section">
      <SectionHeader eyebrow="04" title="Soporte" sub="Carga y velocidad de resolución" />
      <div className="rh-support-grid">
        <SupportCard kpi={tickets} caption="Tickets abiertos · diario" vsLabel={vsLabel} priorWindowDays={priorWindowDays} />
        <SupportCard kpi={resolution} caption="Resolución promedio · horas" vsLabel={vsLabel} priorWindowDays={priorWindowDays} />
      </div>
    </section>
  );
}

function SupportCard({
  kpi,
  caption,
  vsLabel,
  priorWindowDays,
}: {
  kpi: KPI;
  caption: string;
  vsLabel?: string;
  priorWindowDays?: number;
}) {
  const priorLabel = priorWindowDays != null ? `${priorWindowDays}d` : "7d";
  return (
    <div className={`rh-support-card sentiment-${kpi.sentiment}`}>
      <div className="rh-support-head">
        <span className="rh-support-caption">{caption}</span>
        <span className={`rh-kpi-traffic-light tl-${kpi.sentiment}`} aria-hidden="true" />
      </div>
      <div className="rh-support-row">
        <div className="rh-support-value">
          {fmt(kpi.current, kpi.unit)}
          <span className="rh-kpi-unit">{kpi.unit}</span>
        </div>
        <div className="rh-support-delta">
          <DeltaPill pct={kpi.weekDeltaPct} sentiment={kpi.sentiment} vsLabel={vsLabel} />
          <div className="rh-support-prior">
            {priorLabel}: {fmt(kpi.prior, kpi.unit)} {kpi.unit}
          </div>
        </div>
      </div>
      <div className="rh-support-spark">
        <Sparkline values={kpi.spark} width={520} height={56} sentiment={kpi.sentiment} strokeWidth={1.75} />
      </div>
    </div>
  );
}
