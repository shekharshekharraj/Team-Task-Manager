from typing import List
from fastapi import APIRouter, Depends
from database import get_database
from schemas.user import UserResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    db = get_database()
    users = await db.users.find({}).to_list(length=100)
    return [
        UserResponse(
            id=str(u["_id"]),
            email=u["email"],
            name=u["name"],
            role=u["role"],
            created_at=u["created_at"],
        )
        for u in users
    ]
