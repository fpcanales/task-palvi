from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Dataset
from app.schemas import DatasetListItem, DateRange
from app.security import get_current_user

router = APIRouter(prefix="/api/datasets", tags=["datasets"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[DatasetListItem])
async def list_datasets(
    session: AsyncSession = Depends(get_session),
) -> list[DatasetListItem]:
    rows = (
        await session.execute(select(Dataset).order_by(Dataset.id))
    ).scalars().all()
    return [
        DatasetListItem(
            id=r.id,
            label=r.label,
            narrative=r.narrative,
            dateRange=DateRange(**{"from": r.start_date, "to": r.end_date}),
        )
        for r in rows
    ]
