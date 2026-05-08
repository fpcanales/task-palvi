import { fmt } from "../lib/metricUtils";
import type { FunnelStage, Sentiment } from "../types";
import { DeltaPill } from "./DeltaPill";
import { SectionHeader } from "./SectionHeader";

interface Props {
  funnel: FunnelStage[];
  subtitle?: string;
}

export function Funnel({ funnel, subtitle = "Últimos 7 días vs 7 días anteriores" }: Props) {
  const max = funnel[0]?.value ?? 1;
  return (
    <section className="rh-section">
      <SectionHeader eyebrow="02" title="Embudo de conversión" sub={subtitle} />
      <div className="rh-funnel">
        {funnel.map((stage, i) => {
          const widthPct = Math.max(8, ((stage.value ?? 0) / (max || 1)) * 100);
          const sentiment: Sentiment =
            stage.conversionDeltaPct == null
              ? "neutral"
              : stage.conversionDeltaPct > 1
                ? "good"
                : stage.conversionDeltaPct < -1
                  ? "bad"
                  : "neutral";
          return (
            <div key={stage.key}>
              {i > 0 && (
                <div className={`rh-funnel-gap ${sentiment}`}>
                  <div className="rh-funnel-gap-inner">
                    <div className="rh-conv-rate">
                      {stage.conversionFromPrev != null
                        ? stage.conversionFromPrev.toFixed(1) + "%"
                        : "—"}
                    </div>
                    <div className="rh-conv-delta">
                      <DeltaPill pct={stage.conversionDeltaPct} sentiment={sentiment} compact />
                    </div>
                  </div>
                </div>
              )}
              <div className="rh-funnel-stage">
                <div className="rh-stage-meta">
                  <div className="rh-stage-label">{stage.label}</div>
                  <div className="rh-stage-value">
                    {stage.value != null ? fmt(Math.round(stage.value)) : "—"}
                  </div>
                </div>
                <div className="rh-stage-bar-wrap">
                  <div className="rh-stage-bar" style={{ width: widthPct + "%" }}>
                    <div className="rh-stage-bar-fill" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
