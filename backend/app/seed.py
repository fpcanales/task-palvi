"""Seed default alarms and admin user so the dashboard is ready on first boot."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def seed_default_alarms_if_empty(session: AsyncSession) -> None:
    """Seed the three rule-based alarms if no alarms exist yet.

    Thresholds verified against insumos/metrics.json (last day 2026-04-25):
    - avg_response_time_min gt 30: triggers on A (31.46), B (36.45), D (59.81); not C (29.61)
    - stale_deals gt 100: triggers on A (180) only; B/C/D all ~84-87
    - deals_won lt 4: triggers on A (1) only; B/C/D all 6+
    """
    from app.models import Alarm

    has_alarms = (await session.execute(select(Alarm.id).limit(1))).first()
    if has_alarms:
        return

    defaults = [
        {
            "title": "Response time alto",
            "metric_key": "avg_response_time_min",
            "operator": "gt",
            "threshold": 30.0,
            "severity": "critical",
            "position": 0,
        },
        {
            "title": "Stale deals fuera de control",
            "metric_key": "stale_deals",
            "operator": "gt",
            "threshold": 100.0,
            "severity": "warning",
            "position": 1,
        },
        {
            "title": "Pocos deals ganados",
            "metric_key": "deals_won",
            "operator": "lt",
            "threshold": 4.0,
            "severity": "critical",
            "position": 2,
        },
    ]
    for a in defaults:
        session.add(Alarm(**a))
    await session.commit()


async def seed_admin_if_empty(session: AsyncSession) -> None:
    """Seed the default admin user if no users exist yet."""
    from app.models import User
    from app.security import get_password_hash

    has_users = (await session.execute(select(User.id).limit(1))).first()
    if has_users:
        return

    session.add(
        User(
            email="admin@palvi.local",
            password_hash=get_password_hash("palvi"),
            is_active=True,
        )
    )
    await session.commit()
