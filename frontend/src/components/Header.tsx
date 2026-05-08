import type { Dataset, DatasetListItem } from "../types";
import type { View } from "../lib/useViewParam";
import { useAuthContext } from "../lib/AuthContext";

interface Props {
  dataset: Dataset;
  datasets: DatasetListItem[];
  activeId: string;
  onSwitch: (id: string) => void;
  view: View;
  onViewChange: (v: View) => void;
}

export function Header({ dataset, datasets, activeId, onSwitch, view, onViewChange }: Props) {
  const { user, logout } = useAuthContext();
  const today = new Date();
  const greeting = "Buenos días";
  const dateLabel = today.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <header className="rh-header">
      <div className="rh-header-inner">
        <div className="rh-greet">
          <div className="rh-eyebrow">Reporte ejecutivo</div>
          <h1 className="rh-title">{greeting}</h1>
          <div className="rh-meta">
            <span className="rh-date">
              {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
            </span>
            <span className="rh-dot">·</span>
            <span className="rh-range">
              Datos {dataset.metadata.dateRange.from} → {dataset.metadata.dateRange.to}
            </span>
          </div>
        </div>
        <nav className="rh-dataset-switch" role="tablist" aria-label="Dataset">
          {datasets.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={d.id === activeId}
              className={d.id === activeId ? "rh-ds-btn is-active" : "rh-ds-btn"}
              onClick={() => onSwitch(d.id)}
              title={d.narrative}
            >
              {d.id}
            </button>
          ))}
        </nav>
        <nav className="rh-view-switch" role="tablist" aria-label="Vista">
          <button
            role="tab"
            aria-selected={view === "report"}
            className={view === "report" ? "rh-ds-btn is-active" : "rh-ds-btn"}
            onClick={() => onViewChange("report")}
          >
            Reporte
          </button>
          <button
            role="tab"
            aria-selected={view === "rules"}
            className={view === "rules" ? "rh-ds-btn is-active" : "rh-ds-btn"}
            onClick={() => onViewChange("rules")}
          >
            Reglas
          </button>
        </nav>
        <div className="rh-user">
          <span className="rh-user-email">{user?.email}</span>
          <button className="rh-user-logout" onClick={logout} type="button">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
