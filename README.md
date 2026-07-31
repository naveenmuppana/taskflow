# TaskFlow — Task Management API

A secure, async task management REST API built with FastAPI, featuring JWT authentication, PostgreSQL, and a lightweight JavaScript frontend — deployed live on Render with a Neon PostgreSQL database.

🔗 **Live Demo:** https://taskflow-1-oduq.onrender.com
📄 **API Docs (Swagger UI):** https://taskflow-cr3c.onrender.com/docs

> Note: the free-tier backend may take 30-60 seconds to "wake up" on first request after inactivity.

## Features

- **JWT-based authentication** — register, login, and protected routes
- **Task CRUD** — create, read, update, delete tasks with full ownership enforcement (users can only access their own tasks)
- **Rate limiting** on sensitive endpoints (via SlowAPI)
- **Structured logging** (via Loguru)
- **Database migrations** with Alembic
- **Async-first architecture** — FastAPI + SQLAlchemy 2.0 async + asyncpg
- **CORS-configured** for a separately deployed frontend

## Tech Stack

**Backend**
- FastAPI (async)
- SQLAlchemy 2.0 (async ORM)
- PostgreSQL (via Neon, serverless)
- Alembic (migrations)
- Pydantic v2
- JWT (python-jose / PyJWT) + Passlib (bcrypt)
- SlowAPI (rate limiting)
- Loguru (logging)
- uv (dependency management)
- Docker (deployment)

**Frontend**
- Vanilla HTML/CSS/JavaScript (no framework/build step)
- Deployed as a static site

**Infrastructure**
- Render (backend web service + frontend static site)
- Neon (serverless PostgreSQL)

## Project Structure
taskflow/
├── task-manager-api/ # Backend
│ ├── app/
│ │ ├── main.py
│ │ ├── core/ # config, security, exceptions
│ │ ├── db/ # database session/engine
│ │ ├── models/ # SQLAlchemy models
│ │ ├── schemas/ # Pydantic schemas
│ │ ├── api/v1/ # API routes
│ │ └── services/ # business logic
│ ├── alembic/ # migrations
│ ├── tests/
│ ├── Dockerfile
│ └── pyproject.toml
│
└── task-manager-frontend/ # Frontend
├── index.html
├── dashboard.html
├── dashboard.js
├── auth.js
└── style.css

## Local Setup

### Prerequisites
- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager
- PostgreSQL (or use SQLite for quick local testing)

### Backend

```bash
cd task-manager-api

# Install dependencies
uv sync

# Set up environment variables
cp .env.example .env
# then edit .env with your DATABASE_URL and SECRET_KEY

# Run database migrations
uv run alembic upgrade head

# Start the server
uv run uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd task-manager-frontend

# Serve locally
python server.py
```

Frontend will be available at `http://localhost:3000`. Make sure `API_URL` in `auth.js` and `dashboard.js` points to your local backend (`http://localhost:8000/api/v1`) when running locally.

## Running Tests

```bash
cd task-manager-api
uv run pytest -v
```

## Deployment

Both services are deployed on [Render](https://render.com):
- **Backend**: Docker-based Web Service, connected to a Neon PostgreSQL instance
- **Frontend**: Static Site, serving plain HTML/CSS/JS

Environment variables (database URL, JWT secret, CORS origins) are configured directly in Render's dashboard, not committed to the repository.

## What This Project Demonstrates

- RESTful API design with proper resource ownership and authorization
- Async database operations with SQLAlchemy 2.0
- Secure authentication (password hashing, JWT tokens)
- Production deployment across separate frontend/backend services
- Environment-based configuration management
- Database migration workflows

