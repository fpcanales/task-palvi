from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Alarm, Dataset, MetricDefinition, MetricValue
from app.rules import evaluate_rule
from app.schemas import AlarmIn, AlarmOut, AlarmUpdate
from app.security import get_current_user

router = APIRouter(prefix="/api/alarms", tags=["alarms"], dependencies=[Depends(get_current_user)])


async def _validate_metric_key(session: AsyncSession, key: str) -> None:
    """Pre-validate that the metric_key exists in metric_definitions before any INSERT/UPDATE.

    Raises HTTP 422 with a standard Pydantic-style error envelope instead of letting the
    FK violation surface as an IntegrityError (which would produce a 500).
    """
    exists = (
        await session.execute(
            select(MetricDefinition.key).where(MetricDefinition.key == key)
        )
    ).first()
    if exists is None:
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "metric_key"],
                    "msg": "Métrica desconocida",
                    "type": "value_error",
                }
            ],
        )


def _alarm_to_out(alarm: Alarm, triggered: bool = False, current_value: float | None = None) -> AlarmOut:
    """Build an AlarmOut DTO from an Alarm model row plus computed fields."""
    return AlarmOut(
        id=alarm.id,
        title=alarm.title,
        metric_key=alarm.metric_key,
        operator=alarm.operator,
        threshold=alarm.threshold,
        severity=alarm.severity,
        position=alarm.position,
        created_at=alarm.created_at,
        updated_at=alarm.updated_at,
        triggered=triggered,
        current_value=current_value,
    )


@router.get("", response_model=list[AlarmOut])
async def list_alarms(
    dataset: str = Query(..., description="Dataset id (required)"),
    to: date | None = Query(default=None, description="Evaluate rules against the most recent value on or before this date (ISO YYYY-MM-DD). Omit to use the dataset's last available day."),
    session: AsyncSession = Depends(get_session),
) -> list[AlarmOut]:
    # 1. Validate dataset exists
    ds = (await session.execute(select(Dataset.id).where(Dataset.id == dataset))).first()
    if ds is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset}' no existe")

    # 2. Load all alarms ordered by position, created_at
    alarms = list(
        (await session.execute(select(Alarm).order_by(Alarm.position, Alarm.created_at))).scalars().all()
    )

    if not alarms:
        return []

    # 3. Batch-load latest values per metric_key for this dataset (single DISTINCT ON query)
    #    When `to` is provided, restrict to days <= to so rules evaluate at the range boundary.
    keys = {a.metric_key for a in alarms}
    stmt = (
        select(MetricValue.metric_key, MetricValue.value)
        .where(MetricValue.dataset_id == dataset, MetricValue.metric_key.in_(keys))
    )
    if to is not None:
        stmt = stmt.where(MetricValue.day <= to)
    stmt = stmt.distinct(MetricValue.metric_key).order_by(MetricValue.metric_key, MetricValue.day.desc())
    rows = (await session.execute(stmt)).all()
    latest: dict[str, float | None] = {row.metric_key: row.value for row in rows}

    # 4. Build enriched list with triggered/current_value per alarm
    return [
        _alarm_to_out(
            a,
            triggered=evaluate_rule(a.operator, a.threshold, latest.get(a.metric_key)),
            current_value=latest.get(a.metric_key),
        )
        for a in alarms
    ]


@router.post("", response_model=AlarmOut, status_code=status.HTTP_201_CREATED)
async def create_alarm(payload: AlarmIn, session: AsyncSession = Depends(get_session)) -> AlarmOut:
    """Create a new alarm rule. triggered/current_value are not dataset-bound here;
    the frontend refetches via GET /api/alarms?dataset= after creation."""
    await _validate_metric_key(session, payload.metric_key)
    alarm = Alarm(**payload.model_dump())
    session.add(alarm)
    await session.commit()
    await session.refresh(alarm)
    return _alarm_to_out(alarm)


@router.patch("/{alarm_id}", response_model=AlarmOut)
async def update_alarm(alarm_id: int, payload: AlarmUpdate, session: AsyncSession = Depends(get_session)) -> AlarmOut:
    """Update an alarm rule. triggered/current_value are not dataset-bound here;
    the frontend refetches via GET /api/alarms?dataset= after update."""
    alarm = await session.get(Alarm, alarm_id)
    if alarm is None:
        raise HTTPException(status_code=404, detail="Alarm not found")
    data = payload.model_dump(exclude_unset=True)
    if "metric_key" in data and data["metric_key"] is not None:
        await _validate_metric_key(session, data["metric_key"])
    for field, value in data.items():
        setattr(alarm, field, value)
    await session.commit()
    await session.refresh(alarm)
    return _alarm_to_out(alarm)


@router.delete("/{alarm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alarm(alarm_id: int, session: AsyncSession = Depends(get_session)) -> None:
    alarm = await session.get(Alarm, alarm_id)
    if alarm is None:
        raise HTTPException(status_code=404, detail="Alarm not found")
    await session.delete(alarm)
    await session.commit()
