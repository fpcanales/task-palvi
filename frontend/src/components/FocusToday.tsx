import type { Alarm, Dataset, Operator, Severity } from "../types";
import { OPERATOR_SYMBOL } from "../lib/alarmUtils";
import { SectionHeader } from "./SectionHeader";

interface Props {
  alarms: Alarm[];
  dataset: Dataset;
  onCreate: () => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (alarm: Alarm) => void;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Crítico",
  warning: "Atención",
  positive: "Positivo",
};
const SEVERITY_TONE: Record<Severity, string> = {
  critical: "var(--bad)",
  warning: "var(--warn)",
  positive: "var(--good)",
};

export function FocusToday({ alarms, dataset, onCreate, onEdit, onDelete }: Props) {
  const triggered = alarms.filter((a) => a.triggered);
  const count = triggered.length;

  return (
    <section className="rh-section">
      <SectionHeader
        eyebrow="01"
        title="Foco de hoy"
        sub={`${count} señal${count === 1 ? "" : "es"} activa${count === 1 ? "" : "s"}`}
        actions={
          <button className="btn primary" onClick={onCreate}>
            + Nueva regla
          </button>
        }
      />
      {count === 0 ? (
        <div className="empty">Hoy no hay focos rojos en este dataset.</div>
      ) : (
        <div className="rh-focus-stack">
          {triggered.map((a, i) => (
            <FocusCard
              key={a.id}
              alarm={a}
              dataset={dataset}
              idx={i}
              primary={i === 0}
              onEdit={() => onEdit(a)}
              onDelete={() => onDelete(a)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface CardProps {
  alarm: Alarm;
  dataset: Dataset;
  idx: number;
  primary: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function fmt(value: number | null, unit: string): string {
  if (value == null) return "—";
  const rounded =
    unit === "min" || unit === "hr" || unit === "days"
      ? value.toFixed(1)
      : Math.round(value).toString();
  return rounded;
}

function FocusCard({ alarm, dataset, idx, primary, onEdit, onDelete }: CardProps) {
  const tone = SEVERITY_TONE[alarm.severity];
  const meta = dataset.metadata.metrics.find((m) => m.key === alarm.metric_key);
  const symbol = OPERATOR_SYMBOL[alarm.operator as Operator];

  return (
    <article className={`rh-focus-card ${alarm.severity}${primary ? " primary" : ""}`}>
      <div className="rh-focus-rank">
        <span className="rank-num">{String(idx + 1).padStart(2, "0")}</span>
        <span className="rank-sev" style={{ color: tone }}>
          ● {SEVERITY_LABEL[alarm.severity]}
        </span>
      </div>
      <div className="rh-focus-body">
        <h3 className="rh-focus-title">{alarm.title}</h3>
        {meta && (
          <div className="rh-focus-rule mono">
            {meta.label} {symbol} {alarm.threshold} {meta.unit}
          </div>
        )}
        <div className="rh-focus-current">
          Ahora:{" "}
          <span className="mono">
            {fmt(alarm.current_value, meta?.unit ?? "")} {meta?.unit ?? ""}
          </span>
        </div>
      </div>
      <div className="rh-focus-tools">
        <button className="btn ghost" onClick={onEdit} aria-label="Editar regla">
          Editar
        </button>
        <button className="btn ghost danger" onClick={onDelete} aria-label="Eliminar regla">
          Borrar
        </button>
      </div>
    </article>
  );
}
