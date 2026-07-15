import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.task import Task, TaskStatus
from app.core import security

async def test_create_task(client: AsyncClient, auth_headers: dict[str, str]):
    response = await client.post(
        "/api/v1/tasks/",
        json={"title": "Test Task", "description": "This is a test task"},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["description"] == "This is a test task"
    assert data["status"] == "PENDING"
    assert "id" in data
    assert "owner_id" in data

async def test_create_task_unauthorized(client: AsyncClient):
    response = await client.post(
        "/api/v1/tasks/",
        json={"title": "Test Task"}
    )
    assert response.status_code == 401

async def test_read_tasks(
    client: AsyncClient, 
    db: AsyncSession, 
    test_user: User, 
    auth_headers: dict[str, str]
):
    task1 = Task(title="Task 1", description="Desc 1", owner_id=test_user.id)
    task2 = Task(title="Task 2", description="Desc 2", owner_id=test_user.id)
    db.add_all([task1, task2])
    await db.commit()

    response = await client.get("/api/v1/tasks/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert {t["title"] for t in data} == {"Task 1", "Task 2"}

async def test_read_task_by_id(
    client: AsyncClient, 
    db: AsyncSession, 
    test_user: User, 
    auth_headers: dict[str, str]
):
    task = Task(title="Task to retrieve", owner_id=test_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)

    response = await client.get(f"/api/v1/tasks/{task.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Task to retrieve"

async def test_read_other_users_task_forbidden(
    client: AsyncClient, 
    db: AsyncSession, 
    test_user: User, 
    auth_headers: dict[str, str]
):
    hashed_password = security.get_password_hash("password")
    other_user = User(email="other@example.com", hashed_password=hashed_password)
    db.add(other_user)
    await db.commit()
    await db.refresh(other_user)

    other_task = Task(title="Other user task", owner_id=other_user.id)
    db.add(other_task)
    await db.commit()
    await db.refresh(other_task)

    response = await client.get(f"/api/v1/tasks/{other_task.id}", headers=auth_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to access this task"

async def test_update_task(
    client: AsyncClient, 
    db: AsyncSession, 
    test_user: User, 
    auth_headers: dict[str, str]
):
    task = Task(title="Old Title", status=TaskStatus.PENDING, owner_id=test_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)

    response = await client.put(
        f"/api/v1/tasks/{task.id}",
        json={"title": "New Title", "status": "COMPLETED"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Title"
    assert data["status"] == "COMPLETED"

async def test_delete_task(
    client: AsyncClient, 
    db: AsyncSession, 
    test_user: User, 
    auth_headers: dict[str, str]
):
    task = Task(title="Task to delete", owner_id=test_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)

    response = await client.delete(f"/api/v1/tasks/{task.id}", headers=auth_headers)
    assert response.status_code == 200
    
    db_check = await db.get(Task, task.id)
    assert db_check is None
