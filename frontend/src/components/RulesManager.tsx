import type { Alarm, Dataset, MetricDefinition } from "../types";
import { OPERATOR_SYMBOL } from "../lib/alarmUtils";

interface Props {
  alarms: Alarm[];
  metrics: MetricDefinition[];
  dataset: Dataset | null;
  onCreate: () => void;
  onEdit: (a: Alarm) => void;
  onDelete: (a: Alarm) => void;
}

const SEVERITY_TONE = {
  critical: "var(--bad)",
  warning: "var(--warn)",
  positive: "var(--good)",
} as const;

function fmtVal(v: number | null, unit: string) {
  if (v == null) return "—";
  const rounded =
    unit === "min" || unit === "hr" || unit === "days"
      ? v.toFixed(1)
      : Math.round(v).toString();
  return `${rounded} ${unit}`;
}

export function RulesManager({ alarms, metrics, onCreate, onEdit, onDelete }: Props) {
  return (
    <main className="rules-manager">
      <div className="rules-manager-head">
        <h2 className="rh-sec-title">Reglas · {alarms.length}</h2>
        <button className="btn primary" onClick={onCreate}>
          + Nueva regla
        </button>
      </div>
      {alarms.length === 0 ? (
        <div className="empty">
          Aún no hay reglas. Creá la primera para empezar a monitorear señales.
          <div style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={onCreate}>
              + Nueva regla
            </button>
          </div>
        </div>
      ) : (
        <div className="rules-manager-list">
          {alarms.map((a) => {
            const meta = metrics.find((m) => m.key === a.metric_key);
            const unit = meta?.unit ?? "";
            return (
              <div key={a.id} className="rules-manager-row">
                <span
                  className="rm-sev-dot"
                  style={{ background: SEVERITY_TONE[a.severity] }}
                />
                <span className="rm-title">{a.title}</span>
                <span className="rm-rule mono">
                  {meta?.label ?? a.metric_key} {OPERATOR_SYMBOL[a.operator]} {a.threshold}{" "}
                  {unit}
                </span>
                <span className="rm-current">Ahora: {fmtVal(a.current_value, unit)}</span>
                <span className={`rule-badge ${a.triggered ? "active" : "inactive"}`}>
                  {a.triggered ? "Activa hoy" : "Inactiva"}
                </span>
                <div className="rm-actions">
                  <button className="btn ghost" onClick={() => onEdit(a)}>
                    Editar
                  </button>
                  <button
                    className="btn ghost danger"
                    onClick={() => {
                      if (window.confirm(`¿Borrar "${a.title}"?`)) onDelete(a);
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
