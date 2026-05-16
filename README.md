# TaskFlow — Project Management Platform

> Full-stack project management app with role-based access control, Kanban task tracking, and team collaboration — built with Next.js, FastAPI, and MongoDB Atlas.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Application Flow](#application-flow)
5. [Authentication Flow](#authentication-flow)
6. [Role-Based Access Control](#role-based-access-control)
7. [Frontend Routes](#frontend-routes)
8. [API Routes](#api-routes)
9. [Project Structure](#project-structure)
10. [Setup & Installation](#setup--installation)
11. [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer       | Technology                           | Purpose                            |
|-------------|--------------------------------------|------------------------------------|
| Frontend    | Next.js 16 + TypeScript              | App Router, SSR/CSR rendering      |
| Styling     | Tailwind CSS                         | Utility-first responsive design    |
| State       | TanStack Query                       | Server state, caching              |
| Forms       | React Hook Form + Zod                | Form handling & validation         |
| Charts      | Recharts                             | Pie & bar visualizations           |
| HTTP        | Axios                                | API client with JWT interceptors   |
| Backend     | Python FastAPI                       | Async REST API                     |
| Database    | MongoDB Atlas + Motor                | NoSQL async document store         |
| Auth        | JWT (python-jose) + bcrypt (passlib) | Stateless token authentication     |
| Toasts      | react-hot-toast                      | Success/error notifications        |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │              Next.js Frontend                    │   │
│   │  /login  /signup  /dashboard  /projects  /tasks  │   │
│   │  AuthContext │ React Query Cache │ Axios Client  │   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────┘
                       │  HTTPS REST (JSON) + Bearer JWT
                       ▼
┌──────────────────────────────────────────────────────────┐
│               FastAPI Backend  :8000                     │
│   CORS Middleware │ JWT Auth │ Pydantic Validation       │
│   /auth │ /projects │ /tasks │ /users                   │
│              Motor (Async MongoDB Driver)                │
└──────────────────────┬───────────────────────────────────┘
                       │  MongoDB Wire Protocol (TLS)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  MongoDB Atlas (Cloud)                   │
│        users  │  projects  │  tasks                     │
└──────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `users`
```json
{ "_id": "ObjectId", "email": "string (unique)", "name": "string",
  "hashed_password": "bcrypt", "role": "admin | member", "created_at": "ISODate" }
```

### `projects`
```json
{ "_id": "ObjectId", "name": "string", "description": "string",
  "owner_id": "→ users._id", "members": [{ "user_id": "→ users._id", "role": "admin | member" }],
  "status": "active | archived", "created_at": "ISODate", "updated_at": "ISODate" }
```

### `tasks`
```json
{ "_id": "ObjectId", "title": "string", "description": "string",
  "project_id": "→ projects._id", "assignee_id": "→ users._id | null",
  "created_by": "→ users._id", "status": "todo | in_progress | done",
  "priority": "low | medium | high", "due_date": "ISODate | null",
  "created_at": "ISODate", "updated_at": "ISODate" }
```

### Entity Relationships
```
users ──< projects (owner_id)
users ──< projects.members (user_id)
projects ──< tasks (project_id)
users ──< tasks (assignee_id, created_by)
```

---

## Application Flow

```
User visits /
     │
     ▼
Authenticated? ──No──► /login or /signup ──► POST /auth/login
     │                                              │
     │Yes                                    JWT stored in
     ▼                                       localStorage
/dashboard
     │
     ├── View stats (GET /tasks/stats/overview)
     ├── /projects ──► Create / Open project
     │       └── /projects/[id]
     │               ├── Kanban board (GET /tasks?project_id=)
     │               ├── Create task (POST /tasks)
     │               ├── Move task   (PUT /tasks/:id)
     │               └── [Admin] Add/Remove members
     ├── /tasks ──► Filter all tasks by status / priority / project
     └── /admin/users ──► [Admin only] View all users
```

### Task Status Flow
```
[Created] ──► todo ──► in_progress ──► done
                │                      │
                └──────────────────────┘
                    (direct complete)
```

---

## Authentication Flow

```
Client                     FastAPI                    MongoDB
  │                           │                          │
  │── POST /auth/login ───────►│                          │
  │   { email, password }      │── find user by email ───►│
  │                           │◄─────────────────────────│
  │                           │── bcrypt.verify() ────────│
  │                           │── create JWT (HS256, 24h) │
  │◄── { access_token, user } ─│                          │
  │                           │                          │
  │── store JWT in localStorage                          │
  │                           │                          │
  │── GET /projects ──────────►│                          │
  │   Authorization: Bearer   │── decode JWT ─────────────│
  │                           │── fetch user ────────────►│
  │◄── 200 + data ─────────────│◄─────────────────────────│
```

---

## Role-Based Access Control

### Global Roles

| Action                    | Admin | Member |
|---------------------------|:-----:|:------:|
| View all projects         | ✅    | ❌     |
| View own/assigned projects| ✅    | ✅     |
| Create project            | ✅    | ✅     |
| Delete any project        | ✅    | ❌     |
| Access `/admin/users`     | ✅    | ❌     |

### Project-Level Roles

| Action                    | Owner | Project Admin | Member |
|---------------------------|:-----:|:-------------:|:------:|
| View project & tasks      | ✅    | ✅            | ✅     |
| Create tasks              | ✅    | ✅            | ✅     |
| Update own/assigned task  | ✅    | ✅            | ✅     |
| Update any task           | ✅    | ✅            | ❌     |
| Delete any task           | ✅    | ✅            | ❌     |
| Add / remove members      | ✅    | ✅            | ❌     |
| Delete project            | ✅    | ❌            | ❌     |

---

## Frontend Routes

| Route                  | Access        | Description                              |
|------------------------|---------------|------------------------------------------|
| `http://localhost:3000/`          | Public        | Redirects to `/dashboard`                |
| `http://localhost:3000/login`     | Public        | JWT login form                           |
| `http://localhost:3000/signup`    | Public        | Register with role selection             |
| `http://localhost:3000/dashboard` | Auth required | KPI stats, charts, recent tasks/projects |
| `http://localhost:3000/projects`  | Auth required | All accessible projects grid             |
| `http://localhost:3000/projects/[id]` | Auth required | Kanban board + team management       |
| `http://localhost:3000/tasks`     | Auth required | All tasks with filters                   |
| `http://localhost:3000/admin/users` | Admin only  | User management panel                    |

---

## API Routes

**Base URL:** `http://localhost:8000`  
**Interactive Docs:** `http://localhost:8000/docs`  
**Auth header:** `Authorization: Bearer <token>` — required on all routes except `/auth/register` and `/auth/login`

---

### Auth

| Method | Full URL                                  | Access  | Description                  |
|--------|-------------------------------------------|---------|------------------------------|
| POST   | `http://localhost:8000/auth/register`     | Public  | Register user, returns JWT   |
| POST   | `http://localhost:8000/auth/login`        | Public  | Login, returns JWT + user    |
| GET    | `http://localhost:8000/auth/me`           | Auth    | Get current logged-in user   |

**POST `/auth/register` body:**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123", "role": "admin" }
```
**POST `/auth/login` body:**
```json
{ "email": "jane@example.com", "password": "secret123" }
```
**Response (both):**
```json
{ "access_token": "<jwt>", "token_type": "bearer", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }
```

---

### Projects

| Method | Full URL                                                        | Access        | Description                  |
|--------|-----------------------------------------------------------------|---------------|------------------------------|
| GET    | `http://localhost:8000/projects`                                | Auth          | List accessible projects     |
| POST   | `http://localhost:8000/projects`                                | Auth          | Create project               |
| GET    | `http://localhost:8000/projects/{id}`                           | Member+       | Get project with members     |
| PUT    | `http://localhost:8000/projects/{id}`                           | Project Admin | Update name/description      |
| DELETE | `http://localhost:8000/projects/{id}`                           | Owner/Admin   | Delete project + all tasks   |
| POST   | `http://localhost:8000/projects/{id}/members`                   | Project Admin | Add member with role         |
| DELETE | `http://localhost:8000/projects/{id}/members/{user_id}`         | Project Admin | Remove member                |

**POST `/projects` body:**
```json
{ "name": "Marketing Website", "description": "Redesign the company site" }
```
**POST `/projects/{id}/members` body:**
```json
{ "user_id": "664abc...", "role": "member" }
```

---

### Tasks

| Method | Full URL                                        | Access        | Description                              |
|--------|-------------------------------------------------|---------------|------------------------------------------|
| GET    | `http://localhost:8000/tasks`                   | Auth          | List tasks (supports query filters)      |
| POST   | `http://localhost:8000/tasks`                   | Member+       | Create task                              |
| GET    | `http://localhost:8000/tasks/{id}`              | Member+       | Get single task                          |
| PUT    | `http://localhost:8000/tasks/{id}`              | Member+       | Update task fields                       |
| DELETE | `http://localhost:8000/tasks/{id}`              | Creator/Admin | Delete task                              |
| GET    | `http://localhost:8000/tasks/stats/overview`    | Auth          | KPI stats for dashboard                  |

**GET `/tasks` query params:**
```
?project_id=665...        filter by project
?status=in_progress       todo | in_progress | done
?assignee_id=664...       filter by assigned user
```

**POST `/tasks` body:**
```json
{
  "title": "Design landing page",
  "description": "Figma mockup + handoff",
  "project_id": "665...",
  "assignee_id": "664...",
  "status": "todo",
  "priority": "high",
  "due_date": "2026-06-01"
}
```

**GET `/tasks/stats/overview` response:**
```json
{
  "total_projects": 5, "total_tasks": 42,
  "todo_tasks": 15, "in_progress_tasks": 12,
  "done_tasks": 15, "overdue_tasks": 4
}
```

---

### Users

| Method | Full URL                          | Access | Description        |
|--------|-----------------------------------|--------|--------------------|
| GET    | `http://localhost:8000/users`     | Auth   | List all users     |

---

### Error Format

```json
{ "detail": "Human-readable error message" }
```

| Code | Meaning              |
|------|----------------------|
| 400  | Bad request          |
| 401  | Invalid/missing JWT  |
| 403  | Forbidden            |
| 404  | Not found            |
| 422  | Validation error     |

---

## Project Structure

```
Dashboard project/
├── backend/
│   ├── main.py               ← FastAPI app, CORS, lifespan
│   ├── config.py             ← Pydantic settings (.env)
│   ├── database.py           ← Motor MongoDB client
│   ├── requirements.txt
│   ├── .env.example
│   ├── models/               ← MongoDB document models
│   ├── schemas/              ← Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py           ← /auth/*
│   │   ├── projects.py       ← /projects/*
│   │   ├── tasks.py          ← /tasks/*
│   │   └── users.py          ← /users
│   └── utils/auth.py         ← JWT, bcrypt helpers
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/login/         ← Login page
        │   ├── (auth)/signup/        ← Signup page
        │   └── (dashboard)/
        │       ├── layout.tsx        ← Auth guard + sidebar
        │       ├── dashboard/        ← Stats + charts
        │       ├── projects/         ← Project grid
        │       ├── projects/[id]/    ← Kanban + members
        │       ├── tasks/            ← Task list + filters
        │       └── admin/users/      ← Admin user panel
        ├── components/
        │   ├── ui/                   ← Button, Input, Modal, Badge, Card
        │   ├── layout/               ← Sidebar, Header
        │   ├── dashboard/            ← StatsCard, Charts
        │   ├── projects/             ← ProjectCard, CreateProjectModal
        │   └── tasks/                ← TaskCard, TaskKanban, CreateTaskModal
        ├── context/                  ← AuthContext, QueryProvider
        ├── lib/                      ← api.ts (Axios), utils.ts
        └── types/index.ts            ← TypeScript interfaces
```

---

## Setup & Installation

### Prerequisites
- Python 3.11+ · Node.js 18+ · MongoDB Atlas account (free tier)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Fill in your MongoDB URL + secret key
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
# .env.local already exists pointing to localhost:8000
npm run dev
```

Open **http://localhost:3000** — sign up with **Admin** role for full access.  
API docs at **http://localhost:8000/docs**

---

## Environment Variables

### `backend/.env`
| Variable                      | Example                                           |
|-------------------------------|---------------------------------------------------|
| `MONGODB_URL`                 | `mongodb+srv://user:pass@cluster.mongodb.net/`    |
| `DATABASE_NAME`               | `projectmanager`                                  |
| `SECRET_KEY`                  | `your-long-random-secret`                         |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`                                            |
| `ALLOWED_ORIGINS`             | `http://localhost:3000`                           |

### `frontend/.env.local`
| Variable                | Example                    |
|-------------------------|----------------------------|
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8000`    |
