from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import connect_db, close_db
from routers import auth, projects, tasks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Project Management API",
    description="REST API for project and task management with role-based access control",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(users.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Project Management API is running"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
