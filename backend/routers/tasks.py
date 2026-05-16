from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from datetime import datetime
from database import get_database
from schemas.task import TaskCreate, TaskUpdate, TaskResponse
from schemas.user import UserResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
    )


async def serialize_task(task: dict, db) -> TaskResponse:
    assignee = None
    if task.get("assignee_id"):
        try:
            u = await db.users.find_one({"_id": ObjectId(task["assignee_id"])})
            if u:
                assignee = user_to_response(u)
        except Exception:
            pass

    creator = None
    if task.get("created_by"):
        try:
            u = await db.users.find_one({"_id": ObjectId(task["created_by"])})
            if u:
                creator = user_to_response(u)
        except Exception:
            pass

    return TaskResponse(
        id=str(task["_id"]),
        title=task["title"],
        description=task.get("description", ""),
        project_id=task["project_id"],
        assignee_id=task.get("assignee_id"),
        created_by=task["created_by"],
        status=task["status"],
        priority=task["priority"],
        due_date=task.get("due_date"),
        created_at=task["created_at"],
        updated_at=task["updated_at"],
        assignee=assignee,
        creator=creator,
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


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    assignee_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    user_id = str(current_user["_id"])

    query: dict = {}

    if project_id:
        query["project_id"] = project_id
        # Verify access to this project
        try:
            project = await db.projects.find_one({"_id": ObjectId(project_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project ID")
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if current_user["role"] != "admin" and not is_project_member(project, user_id):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Return tasks from projects the user has access to
        if current_user["role"] != "admin":
            accessible_projects = await db.projects.find({
                "$or": [
                    {"owner_id": user_id},
                    {"members": {"$elemMatch": {"user_id": user_id}}},
                ]
            }).to_list(length=200)
            project_ids = [str(p["_id"]) for p in accessible_projects]
            query["project_id"] = {"$in": project_ids}

    if status_filter:
        query["status"] = status_filter
    if assignee_id:
        query["assignee_id"] = assignee_id

    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(length=500)
    return [await serialize_task(t, db) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    user_id = str(current_user["_id"])

    try:
        project = await db.projects.find_one({"_id": ObjectId(data.project_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user["role"] != "admin" and not is_project_member(project, user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Validate assignee if provided
    if data.assignee_id:
        try:
            assignee = await db.users.find_one({"_id": ObjectId(data.assignee_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid assignee ID")
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")

    now = datetime.utcnow()
    task = {
        "title": data.title,
        "description": data.description or "",
        "project_id": data.project_id,
        "assignee_id": data.assignee_id,
        "created_by": user_id,
        "status": data.status or "todo",
        "priority": data.priority or "medium",
        "due_date": data.due_date,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.tasks.insert_one(task)
    task["_id"] = result.inserted_id
    return await serialize_task(task, db)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID")

    task = await db.tasks.find_one({"_id": oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": ObjectId(task["project_id"])})
        if not project or not is_project_member(project, user_id):
            raise HTTPException(status_code=403, detail="Access denied")

    return await serialize_task(task, db)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID")

    task = await db.tasks.find_one({"_id": oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": ObjectId(task["project_id"])})
        if not project or not is_project_member(project, user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        # Members can only update their own tasks unless they are project admin
        if not is_project_admin(project, user_id) and task["created_by"] != user_id and task.get("assignee_id") != user_id:
            raise HTTPException(status_code=403, detail="You can only update tasks assigned to you or created by you")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    await db.tasks.update_one({"_id": oid}, {"$set": update_data})

    updated = await db.tasks.find_one({"_id": oid})
    return await serialize_task(updated, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID")

    task = await db.tasks.find_one({"_id": oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = str(current_user["_id"])
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": ObjectId(task["project_id"])})
        if not project or not is_project_member(project, user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        if not is_project_admin(project, user_id) and task["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Only task creator or project admin can delete tasks")

    await db.tasks.delete_one({"_id": oid})


@router.get("/stats/overview")
async def get_stats(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])

    if current_user["role"] == "admin":
        project_filter = {}
        task_filter = {}
    else:
        accessible_projects = await db.projects.find({
            "$or": [
                {"owner_id": user_id},
                {"members": {"$elemMatch": {"user_id": user_id}}},
            ]
        }).to_list(length=200)
        project_ids = [str(p["_id"]) for p in accessible_projects]
        project_filter = {"_id": {"$in": [ObjectId(pid) for pid in project_ids]}}
        task_filter = {"project_id": {"$in": project_ids}}

    total_projects = await db.projects.count_documents(project_filter)
    total_tasks = await db.tasks.count_documents(task_filter)
    todo_tasks = await db.tasks.count_documents({**task_filter, "status": "todo"})
    in_progress_tasks = await db.tasks.count_documents({**task_filter, "status": "in_progress"})
    done_tasks = await db.tasks.count_documents({**task_filter, "status": "done"})
    overdue_tasks = await db.tasks.count_documents({
        **task_filter,
        "due_date": {"$lt": datetime.utcnow()},
        "status": {"$ne": "done"},
    })

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "todo_tasks": todo_tasks,
        "in_progress_tasks": in_progress_tasks,
        "done_tasks": done_tasks,
        "overdue_tasks": overdue_tasks,
    }
