from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ProjectMember(BaseModel):
    user_id: str
    role: str = "member"  # admin or member


class ProjectInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    description: Optional[str] = ""
    owner_id: str
    members: List[ProjectMember] = []
    status: str = "active"  # active or archived
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
