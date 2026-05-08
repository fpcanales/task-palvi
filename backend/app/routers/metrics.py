from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Dataset, MetricDefinition, MetricValue
from app.schemas import DatasetMetadata, DatasetOut, DateRange, DayValues, MetricDefinitionOut
from app.security import get_current_user

router = APIRouter(prefix="/api/metrics", tags=["metrics"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DatasetOut)
async def get_dataset(
    dataset: str = Query("A"),
    session: AsyncSession = Depends(get_session),
) -> DatasetOut:
    ds = (
        await session.execute(select(Dataset).where(Dataset.id == dataset))
    ).scalar_one_or_none()
    if ds is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset}' not found")

    metrics = (
        await session.execute(select(MetricDefinition).order_by(MetricDefinition.key))
    ).scalars().all()

    values = (
        await session.execute(
            select(MetricValue)
            .where(MetricValue.dataset_id == dataset)
            .order_by(MetricValue.day)
        )
    ).scalars().all()

    by_day: dict[str, dict[str, float | None]] = defaultdict(dict)
    for v in values:
        by_day[v.day.isoformat()][v.metric_key] = v.value

    days = [DayValues(date=d, values=by_day[d.isoformat()]) for d in sorted({v.day for v in values})]

    return DatasetOut(
        metadata=DatasetMetadata(
            id=ds.id,
            label=ds.label,
            narrative=ds.narrative,
            dateRange=DateRange(**{"from": ds.start_date, "to": ds.end_date}),
            metrics=[MetricDefinitionOut.model_validate(m) for m in metrics],
        ),
        days=days,
    )
