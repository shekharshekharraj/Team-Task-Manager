from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from schemas.user import UserResponse


class ProjectMemberSchema(BaseModel):
    user_id: str
    role: str = "member"


class ProjectMemberResponse(BaseModel):
    user_id: str
    role: str
    user: Optional[UserResponse] = None


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    owner_id: str
    members: List[ProjectMemberResponse] = []
    status: str
    created_at: datetime
    updated_at: datetime
    task_count: Optional[int] = 0
    owner: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: str
    role: Optional[str] = "member"
