from datetime import datetime, date
from typing import Optional, Any
from pydantic import BaseModel, field_validator
from schemas.user import UserResponse


def parse_date_field(v: Any) -> Optional[datetime]:
    """Accept empty string, None, date string (YYYY-MM-DD), or full datetime string."""
    if v is None or v == "" or v == "null":
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)
    if isinstance(v, str):
        # Try full datetime first, then date-only
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d"):
            try:
                return datetime.strptime(v, fmt)
            except ValueError:
                continue
    raise ValueError(f"Cannot parse due_date: {v!r}")


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    project_id: str
    assignee_id: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None

    @field_validator("assignee_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Optional[str]:
        if v == "" or v == "null":
            return None
        return v

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, v: Any) -> Optional[datetime]:
        return parse_date_field(v)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

    @field_validator("assignee_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Optional[str]:
        if v == "" or v == "null":
            return None
        return v

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, v: Any) -> Optional[datetime]:
        return parse_date_field(v)


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    project_id: str
    assignee_id: Optional[str] = None
    created_by: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserResponse] = None
    creator: Optional[UserResponse] = None

    class Config:
        from_attributes = True
