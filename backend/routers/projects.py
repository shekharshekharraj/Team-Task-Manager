from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from datetime import datetime
from database import get_database
from schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectMemberResponse,
    AddMemberRequest,
)
from schemas.user import UserResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
    )


async def serialize_project(project: dict, db) -> ProjectResponse:
    # Fetch owner
    owner = await db.users.find_one({"_id": ObjectId(project["owner_id"])})
    owner_resp = user_to_response(owner) if owner else None

    # Fetch members with user details
    members = []
    for m in project.get("members", []):
        user = await db.users.find_one({"_id": ObjectId(m["user_id"])})
        members.append(
            ProjectMemberResponse(
                user_id=m["user_id"],
                role=m["role"],
                user=user_to_response(user) if user else None,
            )
        )

    # Count tasks
    task_count = await db.tasks.count_documents({"project_id": str(project["_id"])})

    return ProjectResponse(
        id=str(project["_id"]),
        name=project["name"],
        description=project.get("description", ""),
        owner_id=project["owner_id"],
        members=members,
        status=project["status"],
        created_at=project["created_at"],
        updated_at=project["updated_at"],
        task_count=task_count,
        owner=owner_resp,
    )


def is_project_member(project: dict, user_id: str) -> bool:
    if project["owner_id"] == user_id:
        return True
    return any(m["user_id"] == user_id for m in project.get("members", []))


def is_project_admin(project: dict, user_id: str) -> bool:
    if project["owner_id"] == user_id:
        return True
    for m in project.get("members", []):
        if m["user_id"] == user_id and m["role"] == "admin":
            return True
    return False


@router.get("", response_model=List[ProjectResponse])
async def list_projects(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])

    # Global admins see all projects; members see only their projects
    if current_user["role"] == "admin":
        cursor = db.projects.find({})
    else:
        cursor = db.projects.find({
            "$or": [
                {"owner_id": user_id},
                {"members": {"$elemMatch": {"user_id": user_id}}},
            ]
        })

    projects = await cursor.to_list(length=100)
    result = []
    for p in projects:
        result.append(await serialize_project(p, db))
    return result


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    now = datetime.utcnow()
    project = {
        "name": data.name,
        "description": data.description or "",
        "owner_id": str(current_user["_id"]),
        "members": [],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.projects.insert_one(project)
    project["_id"] = result.inserted_id
    return await serialize_project(project, db)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin" and not is_project_member(project, user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    return await serialize_project(project, db)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin" and not is_project_admin(project, user_id):
        raise HTTPException(status_code=403, detail="Only project admins can update this project")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    await db.projects.update_one({"_id": oid}, {"$set": update_data})

    updated = await db.projects.find_one({"_id": oid})
    return await serialize_project(updated, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin" and project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete this project")

    await db.tasks.delete_many({"project_id": project_id})
    await db.projects.delete_one({"_id": oid})


@router.post("/{project_id}/members", response_model=ProjectResponse)
async def add_member(
    project_id: str,
    data: AddMemberRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin" and not is_project_admin(project, user_id):
        raise HTTPException(status_code=403, detail="Only project admins can add members")

    # Validate target user exists
    try:
        target_oid = ObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    target_user = await db.users.find_one({"_id": target_oid})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Remove existing membership and re-add (upsert)
    await db.projects.update_one(
        {"_id": oid},
        {"$pull": {"members": {"user_id": data.user_id}}},
    )
    await db.projects.update_one(
        {"_id": oid},
        {
            "$push": {"members": {"user_id": data.user_id, "role": data.role}},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    updated = await db.projects.find_one({"_id": oid})
    return await serialize_project(updated, db)


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectResponse)
async def remove_member(
    project_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    current_user_id = str(current_user["_id"])
    if current_user["role"] != "admin" and not is_project_admin(project, current_user_id):
        raise HTTPException(status_code=403, detail="Only project admins can remove members")

    if project["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    await db.projects.update_one(
        {"_id": oid},
        {
            "$pull": {"members": {"user_id": user_id}},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    updated = await db.projects.find_one({"_id": oid})
    return await serialize_project(updated, db)
