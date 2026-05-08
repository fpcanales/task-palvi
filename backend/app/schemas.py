from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["critical", "warning", "positive"]
Operator = Literal["lt", "lte", "gt", "gte", "eq", "neq"]


class MetricDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    label: str
    unit: str
    direction: str
    description: str


class DayValues(BaseModel):
    date: date
    values: dict[str, float | None]


class DateRange(BaseModel):
    from_: date = Field(alias="from")
    to: date

    model_config = ConfigDict(populate_by_name=True)


class DatasetMetadata(BaseModel):
    id: str
    label: str
    narrative: str
    dateRange: DateRange
    metrics: list[MetricDefinitionOut]


class DatasetOut(BaseModel):
    metadata: DatasetMetadata
    days: list[DayValues]


class DatasetListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    narrative: str
    dateRange: DateRange


class AlarmIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    metric_key: str = Field(min_length=1, max_length=64)
    operator: Operator
    threshold: float
    severity: Severity
    position: int = 0


class AlarmUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    metric_key: str | None = Field(default=None, min_length=1, max_length=64)
    operator: Operator | None = None
    threshold: float | None = None
    severity: Severity | None = None
    position: int | None = None


class AlarmOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    metric_key: str
    operator: Operator
    threshold: float
    severity: Severity
    position: int
    created_at: datetime
    updated_at: datetime
    triggered: bool
    current_value: float | None


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in_seconds: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_active: bool
