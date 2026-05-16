from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from database import get_database
from schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


def serialize_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    db = get_database()

    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)

    from datetime import datetime
    new_user = {
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed_password,
        "role": user_data.role if user_data.role in ["admin", "member"] else "member",
        "created_at": datetime.utcnow(),
    }

    result = await db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id

    access_token = create_access_token(
        data={"sub": str(result.inserted_id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        user=serialize_user(new_user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    db = get_database()

    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        user=serialize_user(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        created_at=current_user["created_at"],
    )
