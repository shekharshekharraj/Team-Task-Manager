from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TaskInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    title: str
    description: Optional[str] = ""
    project_id: str
    assignee_id: Optional[str] = None
    created_by: str
    status: str = "todo"  # todo, in_progress, done
    priority: str = "medium"  # low, medium, high
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
