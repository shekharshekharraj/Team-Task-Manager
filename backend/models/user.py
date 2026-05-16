from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


class UserInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    email: str
    name: str
    hashed_password: str
    role: str = "member"  # admin or member
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
