# Task Manager API

A modern, high-performance, asynchronous Task Manager API built using **FastAPI**, **SQLAlchemy 2.0 (async)**, **Pydantic v2**, and **Alembic**. It uses the **uv** package manager for fast, reliable dependency resolution.

## Features

- **Asynchronous Architecture**: Built entirely with async database drivers (`asyncpg` for PostgreSQL, `aiosqlite` for SQLite).
- **Authentication**: JWT access and refresh token authentication.
- **CRUD Operations**: Secure Task management scoped to the authenticated owner.
- **Robust Configuration**: Dynamic setting loads via `pydantic-settings` from `.env`.
- **Database Migrations**: Preconfigured Alembic template with support for auto-generating migrations.
- **Testing**: Clean test suite with an in-memory database and async pytest fixtures.

## Tech Stack

- **Framework**: FastAPI
- **Web Server**: Uvicorn
- **ORM**: SQLAlchemy 2.0 (asyncio)
- **Database Drivers**: `asyncpg` (PostgreSQL) / `aiosqlite` (SQLite)
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Security**: PyJWT, Bcrypt
- **Package Manager**: uv
- **Testing**: pytest, pytest-asyncio, httpx

---

## Local Setup

### 1. Prerequisites

Make sure you have [uv](https://github.com/astral-sh/uv) installed on your system.

### 2. Configure Environment

Copy `.env.example` to `.env` and set your secrets:
```bash
cp .env.example .env
```

By default, the database is configured to use a local SQLite file (`task_manager.db`) for simple setup. If you'd like to use PostgreSQL, modify the `DATABASE_URL` in `.env`.

### 3. Install Dependencies

Sync the dependencies and set up the virtual environment:
```bash
uv sync
```

This will automatically create a `.venv` directory and download all required packages.

### 4. Run Migrations

Alembic migrations are configured to use the `DATABASE_URL` defined in your `.env`. Run the migrations to initialize your database schema:
```bash
uv run alembic upgrade head
```

### 5. Run the Server

Start the local development server:
```bash
uv run uvicorn app.main:app --reload
```

The API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000).
Interactive Swagger docs can be accessed at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## Running Tests

Pytest is configured to run tests using a clean, in-memory SQLite database (`sqlite+aiosqlite:///:memory:`).

To run the test suite:
```bash
uv run pytest
```

---

## Running with Docker

### Build Image
```bash
docker build -t task-manager-api .
```

### Run Container
```bash
docker run -p 8000:8000 --env-file .env task-manager-api
```
