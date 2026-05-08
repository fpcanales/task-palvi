"""Load metric data from the metrics.json file into the database.

Replaces the synthetic seed from seed.py. Idempotent by default — skips if the
datasets table already has 4 rows. Set FORCE_RESEED=true to wipe and re-import.
"""

from __future__ import annotations

import json
import os
from datetime import date as Date

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Dataset, MetricDefinition, MetricValue

# Executive narrative per dataset (rioplatense Spanish, one sentence each).
# Authored from the last-30-day trend visible in metrics.json:
#   A: stale deals +70% YoY, deals_won -18%, leads top-of-funnel healthy but pipeline clogged.
#   B: steady improvement, deals_won +16%, stale deals slightly down — no critical alarm.
#   C: strong growth, deals_won +77% YoY, leads and revenue trending up.
#   D: response time worsening (+27% YoY, now avg 41 min), rest of metrics stable.
NARRATIVES: dict[str, str] = {
    "A": "El pipeline está atascado: stale deals crecieron 70% en el año y la conversión a deals won cayó 18%, señal de que el cuello está en el seguimiento, no en la generación de leads.",
    "B": "Desempeño estable con mejora gradual: deals won subió 16% y el inventario de stale deals bajó levemente, sin alertas críticas que escalar hoy.",
    "C": "Trimestre de tracción: deals won creció 77% interanual y tanto leads como calificados siguen en alza, aunque el volumen de cierre empieza a presionar los tiempos de soporte.",
    "D": "El response time promedio escaló de 32 a 41 minutos (+27%), el peor indicador del año; el resto del embudo se mantiene estable pero este deterioro frena la conversión si no se atiende.",
}

LABELS: dict[str, str] = {
    "A": "Dataset A",
    "B": "Dataset B",
    "C": "Dataset C",
    "D": "Dataset D",
}

METRICS_JSON_PATH = os.environ.get("METRICS_JSON_PATH", "/app/data/metrics.json")
FORCE_RESEED = os.environ.get("FORCE_RESEED", "").lower() == "true"


async def ingest_metrics(session: AsyncSession) -> None:
    """Ingest metrics from metrics.json into the database.

    Idempotent: skips if 4 datasets already exist and FORCE_RESEED is not set.
    When FORCE_RESEED=true: deletes metric_values then datasets (FK order) and re-imports.
    """
    existing_ids = set((await session.execute(select(Dataset.id))).scalars().all())

    if len(existing_ids) == 4 and not FORCE_RESEED:
        return

    if FORCE_RESEED:
        await session.execute(delete(MetricValue))
        await session.execute(delete(Dataset))
        await session.flush()
        existing_ids = set()

    with open(METRICS_JSON_PATH, encoding="utf-8") as f:
        payload = json.load(f)

    # Upsert MetricDefinition rows — shared across all datasets, first dataset wins.
    # Normalize unit "hours" -> "hr" at ingest time so the frontend fmt() needs no change.
    first_block = payload["A"]
    for m in first_block["metadata"]["metrics"]:
        unit = "hr" if m["unit"] == "hours" else m["unit"]
        stmt = (
            pg_insert(MetricDefinition)
            .values(
                key=m["key"],
                label=m["label"],
                unit=unit,
                direction=m["direction"],
                description=m["description"],
            )
            .on_conflict_do_update(
                index_elements=["key"],
                set_={
                    "label": m["label"],
                    "unit": unit,
                    "direction": m["direction"],
                    "description": m["description"],
                },
            )
        )
        await session.execute(stmt)

    # Insert Dataset rows and bulk-insert MetricValue rows per dataset.
    # Skip datasets already seeded — recovers gracefully from a crash mid-ingest.
    for ds_id in ("A", "B", "C", "D"):
        if ds_id in existing_ids:
            continue
        block = payload[ds_id]
        meta = block["metadata"]

        session.add(
            Dataset(
                id=ds_id,
                label=LABELS[ds_id],
                narrative=NARRATIVES[ds_id],
                start_date=Date.fromisoformat(meta["start_date"]),
                end_date=Date.fromisoformat(meta["end_date"]),
            )
        )
        await session.flush()  # ensure dataset row is visible before FK inserts

        rows: list[dict] = []
        for day_entry in block["days"]:
            day = Date.fromisoformat(day_entry["date"])
            for key, val in day_entry["metrics"].items():
                rows.append({"dataset_id": ds_id, "metric_key": key, "day": day, "value": val})

        # Bulk insert for performance (~4 015 rows per dataset, ~16 060 total).
        await session.execute(MetricValue.__table__.insert(), rows)

    await session.commit()
