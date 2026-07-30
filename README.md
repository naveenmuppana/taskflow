# TaskFlow — Enterprise Task Manager

A full-stack task management application built for productivity and clarity. TaskFlow features a **FastAPI** backend with async database support and a clean **Vanilla JavaScript** frontend with a premium, healthcare-grade UI theme. It includes JWT authentication, subtasks, categories, tags, a Pomodoro focus timer, and a calendar view with Indian national holidays.

---

## ✨ Features

### Authentication
- JWT-based login with **access tokens** (30 min) and **refresh tokens** (7 days)
- Auto token refresh on expiry — no sudden logouts
- Secure logout revokes all tokens server-side (token versioning)
- Password hashing with bcrypt (12 rounds)
- Rate limiting on login and register (5 requests/minute)

### Task Management
- Create, update, delete tasks
- 4 status levels: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`
- 5 priority levels: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `URGENT`
- Due dates with overdue detection
- Reminder scheduling (`remind_at` field)
- Archive tasks without deleting
- Server-side search, filter by status/priority/category/project, and sort
- Real-time stat cards (total, pending, completed, overdue) powered by server-computed SQL stats

### Organisation
- **Categories** — create color-coded categories and assign tasks
- **Tags** — multi-tag tasks with custom colors
- **Projects** — group tasks under projects (API-ready, backend complete)
- **Subtasks** — add checkbox subtasks to any task with progress tracking

### Calendar
- Full-calendar month/week view (powered by FullCalendar)
- Tasks appear on their due dates
- Indian national holidays highlighted for 2026

### Focus Mode
- Pomodoro-style 25-minute countdown timer
- Automatically transitions task to `IN_PROGRESS` when Focus Mode opens
- Play, pause, reset controls

### UI / UX
- Premium enterprise-grade design (healthcare aesthetic)
- Dual theme: **Light** and **Dark** mode, persisted across sessions
- Subtle Indian architectural watermarks (Charminar, Gateway of India, Konark wheel) at ≤5% opacity
- Smooth transitions, solid-color buttons (no gradients)
- Sidebar navigation: All / Pending / In Progress / Completed / Cancelled / Calendar
- Browser notification reminders (with user permission)

---

## 🏗️ Architecture

```
taskflow/
│
├── task-manager-api/          # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/            # Route handlers (auth, tasks, categories, tags, subtasks, projects)
│   │   ├── core/              # Config, security (JWT/bcrypt), exceptions, logger, rate limiter
│   │   ├── db/                # Async SQLAlchemy session & engine setup
│   │   ├── models/            # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/           # Pydantic v2 request/response schemas
│   │   └── services/          # Business logic layer (auth, task, category, tag, subtask, project)
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Pytest test suite (auth + tasks)
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env.example
│
├── task-manager-frontend/     # Vanilla JS Frontend
│   ├── index.html             # Login / Register page
│   ├── dashboard.html         # Main application dashboard
│   ├── auth.js                # Login, register, form handling
│   ├── dashboard.js           # Tasks, categories, tags, subtasks, calendar, focus timer
│   ├── style.css              # Full design system (light + dark themes, all components)
│   ├── server.py              # Local dev server (fixes MIME type issues on Windows)
│   └── Dockerfile
│
├── docker-compose.yml         # Full stack Docker Compose
└── README.md                  # This file
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥0.110 | Web framework |
| **Uvicorn** | ≥0.28 | ASGI server |
| **SQLAlchemy** | ≥2.0 (async) | ORM |
| **Pydantic v2** | ≥2.6 | Data validation & serialization |
| **Alembic** | ≥1.13 | Database migrations |
| **aiosqlite** | ≥0.20 | SQLite async driver (default/dev) |
| **asyncpg** | ≥0.29 | PostgreSQL async driver (production) |
| **PyJWT** | ≥2.8 | JWT token encoding/decoding |
| **bcrypt** | ≥4.1 | Password hashing |
| **SlowAPI** | ≥0.1.9 | Rate limiting |
| **Loguru** | ≥0.7 | Structured logging |
| **uv** | latest | Fast Python package manager |

### Frontend
| Technology | Purpose |
|---|---|
| **HTML5 / Vanilla JS** | Core application — no framework |
| **CSS3 (custom variables)** | Full design system, light/dark themes |
| **FullCalendar** | Interactive calendar view |
| **Google Fonts (Inter)** | Typography |

### DevOps
| Technology | Purpose |
|---|---|
| **Docker** | Containerisation (both services) |
| **Docker Compose** | Orchestrates API + Frontend together |
| **Pytest + pytest-asyncio** | Async test suite |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python ≥ 3.11
- [`uv`](https://github.com/astral-sh/uv) — fast Python package manager

### 1. Clone the repository
```bash
git clone https://github.com/naveenmuppana/taskflow.git
cd taskflow
```

### 2. Set up the API
```bash
cd task-manager-api

# Copy environment config
cp .env.example .env
# (Edit .env and set a strong SECRET_KEY before production use)

# Install dependencies — creates .venv automatically
uv sync

# Run database migrations to create schema
uv run alembic upgrade head

# Start the API development server
uv run uvicorn app.main:app --reload
```

The API is now running at: **http://localhost:8000**  
Interactive Swagger docs: **http://localhost:8000/docs**

### 3. Set up the Frontend
Open a **new terminal**:
```bash
cd task-manager-frontend

# Start the local dev server
python server.py
```

The frontend is now running at: **http://localhost:3000**

---

## 🐳 Docker (Full Stack)

Run both services (API + Frontend) together:
```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## ⚙️ Environment Variables

File location: `task-manager-api/.env`  
Copy from `.env.example`:

```env
PROJECT_NAME="Task Manager API"
API_V1_STR="/api/v1"

# JWT — CHANGE THIS to a long random string in production!
SECRET_KEY="your-secret-key-for-jwt-token-signing-use-a-strong-random-value"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_MINUTES=10080

# CORS — list your frontend origins explicitly (no wildcards in production)
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]

# Database
# SQLite (default, no setup needed):
DATABASE_URL=sqlite+aiosqlite:///./task_manager.db

# PostgreSQL (for production — uncomment and configure):
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/taskflow
```

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`.  
Full interactive documentation is available at **http://localhost:8000/docs**.

### Authentication — `/api/v1/auth`

| Method | Endpoint | Requires Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | ❌ | 5/min | Register a new user account |
| `POST` | `/auth/login` | ❌ | 5/min | Login and receive access + refresh tokens |
| `POST` | `/auth/refresh` | ❌ | 10/min | Exchange a refresh token for new tokens |
| `POST` | `/auth/logout` | ✅ | — | Revoke all tokens for the current user |

### Tasks — `/api/v1/tasks`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/tasks/stats` | ✅ | Get total, pending, completed, overdue counts |
| `GET` | `/tasks/` | ✅ | List tasks (search, filter, sort, pagination) |
| `POST` | `/tasks/` | ✅ | Create a new task |
| `GET` | `/tasks/{id}` | ✅ | Get a single task by ID |
| `PUT` | `/tasks/{id}` | ✅ | Update a task (all fields optional) |
| `DELETE` | `/tasks/{id}` | ✅ | Permanently delete a task |

**Query parameters for `GET /tasks/`:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Full-text search on title and description |
| `status` | enum | `PENDING` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED` |
| `priority` | enum | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` / `URGENT` |
| `category_id` | int | Filter by category |
| `project_id` | int | Filter by project |
| `sort_by` | string | `newest` / `oldest` / `due_date` / `priority` / `alphabetically` |
| `skip` | int | Pagination offset (default: 0) |
| `limit` | int | Page size (default: 100) |

### Categories — `/api/v1/categories`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/categories/` | ✅ | List all categories |
| `POST` | `/categories/` | ✅ | Create a category (name + color) |
| `PUT` | `/categories/{id}` | ✅ | Update a category |
| `DELETE` | `/categories/{id}` | ✅ | Delete a category |

### Tags — `/api/v1/tags`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/tags/` | ✅ | List all tags |
| `POST` | `/tags/` | ✅ | Create a tag (name + color) |
| `DELETE` | `/tags/{id}` | ✅ | Delete a tag |

### Subtasks — `/api/v1/subtasks`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/subtasks/` | ✅ | Add a subtask to a task |
| `PUT` | `/subtasks/{id}` | ✅ | Toggle subtask completion |
| `DELETE` | `/subtasks/{id}` | ✅ | Delete a subtask |

### Projects — `/api/v1/projects`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/projects/` | ✅ | List all projects |
| `POST` | `/projects/` | ✅ | Create a project |
| `PUT` | `/projects/{id}` | ✅ | Update a project |
| `DELETE` | `/projects/{id}` | ✅ | Delete a project |

---

## 🧪 Running Tests

The test suite runs against an **in-memory SQLite database** — no external setup required.

```bash
cd task-manager-api
uv run pytest
```

```bash
# Run with verbose output
uv run pytest -v

# Run a specific test file
uv run pytest tests/test_tasks.py
```

Tests cover:
- User registration, login, and duplicate detection
- JWT token refresh and logout revocation
- Task CRUD (create, read, update, delete)
- Ownership enforcement — users cannot access each other's tasks

---

## 🗄️ Database & Migrations

The default setup uses **SQLite** (zero configuration, great for development).

### Switching to PostgreSQL
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/taskflow
```

Then re-run migrations:
```bash
uv run alembic upgrade head
```

### Migration Commands
```bash
# Apply all pending migrations
uv run alembic upgrade head

# Create a new auto-generated migration (after changing models)
uv run alembic revision --autogenerate -m "add_new_column"

# Roll back the last migration
uv run alembic downgrade -1

# View migration history
uv run alembic history
```

---

## 🔒 Security Design

| Feature | Implementation |
|---|---|
| **Token Versioning** | Each user has a `token_version` integer. Logout increments it — all previously issued tokens become invalid instantly, no blacklist needed |
| **Password Security** | bcrypt with 12 salt rounds. Plain-text passwords are never stored anywhere |
| **Rate Limiting** | Auth endpoints capped at 5 req/min per IP via SlowAPI |
| **Security Headers** | Every response includes `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security` |
| **CORS** | Explicitly configured via env variable — no `*` wildcards |
| **Owner Scoping** | Every task query is filtered by `owner_id = current_user.id` — cross-user data access is impossible |
| **Input Validation** | All request bodies validated by Pydantic v2 with field-level constraints |

---

## 🗺️ Roadmap

- [ ] Projects UI in the frontend (backend API is already complete)
- [ ] Task archive view in the frontend
- [ ] WebSocket push notifications for `remind_at` reminders (replace 60s browser poll)
- [ ] Dynamic multi-year Indian holiday support (not hardcoded)
- [ ] Pagination UI — "Load more" button for task list
- [ ] Recurring tasks (daily / weekly / monthly)
- [ ] Team collaboration — share tasks/projects with other users
- [ ] Mobile-responsive layout improvements

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Make changes and write/update tests
4. Run the test suite: `uv run pytest`
5. Commit your changes: `git commit -m "feat: add my feature"`
6. Push and open a Pull Request

---

## 📄 License

This project is intended for personal and educational use.

---

*Built with ❤️ in India — clean architecture, premium design, production-ready foundation.*
