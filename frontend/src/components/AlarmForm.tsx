import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { OPERATOR_OPTIONS } from "../lib/alarmUtils";
import type { Alarm, AlarmInput, MetricDefinition, Operator, Severity } from "../types";

interface Props {
  initial?: Alarm | null;
  metrics: MetricDefinition[];
  onSubmit: (payload: AlarmInput) => Promise<void> | void;
  onCancel: () => void;
  eyebrow?: string;
}

const SEVERITIES: Severity[] = ["critical", "warning", "positive"];
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Crítico",
  warning: "Atención",
  positive: "Positivo",
};

export function AlarmForm({ initial, metrics, onSubmit, onCancel, eyebrow = "Foco de hoy" }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [metricKey, setMetricKey] = useState<string>(
    initial?.metric_key ?? metrics[0]?.key ?? "",
  );
  const [operator, setOperator] = useState<Operator>(initial?.operator ?? "gt");
  const [thresholdStr, setThresholdStr] = useState(
    initial ? String(initial.threshold) : "",
  );
  const [severity, setSeverity] = useState<Severity>(initial?.severity ?? "critical");
  const [submitting, setSubmitting] = useState(false);

  const selectedMeta = metrics.find((m) => m.key === metricKey);
  const threshold = Number.parseFloat(thresholdStr);
  const isValid =
    title.trim().length > 0 &&
    metricKey.length > 0 &&
    operator.length > 0 &&
    Number.isFinite(threshold);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        metric_key: metricKey,
        operator,
        threshold,
        severity,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-head">
          <div className="rh-eyebrow">{eyebrow}</div>
          <div className="modal-title">{initial ? "Editar regla" : "Nueva regla"}</div>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label" htmlFor="alarm-title">
              Nombre
            </label>
            <input
              id="alarm-title"
              className="input"
              autoFocus
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Response time alto"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="alarm-metric">
              Métrica
            </label>
            <select
              id="alarm-metric"
              className="select"
              required
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
            >
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="alarm-operator">
                Operador
              </label>
              <select
                id="alarm-operator"
                className="select"
                value={operator}
                onChange={(e) => setOperator(e.target.value as Operator)}
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="alarm-threshold">
                Umbral
              </label>
              <div className="input-with-hint">
                <input
                  id="alarm-threshold"
                  className="input"
                  type="number"
                  step="any"
                  required
                  value={thresholdStr}
                  onChange={(e) => setThresholdStr(e.target.value)}
                  placeholder="0"
                />
                {selectedMeta && (
                  <span className="field-hint">{selectedMeta.unit}</span>
                )}
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="alarm-severity">
              Severidad
            </label>
            <select
              id="alarm-severity"
              className="select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={submitting || !isValid}
          >
            {submitting ? "Guardando…" : initial ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
}
