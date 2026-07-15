import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user import User
from app.core import security

async def test_register_user(client: AsyncClient, db: AsyncSession):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": "securepassword"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data
    assert data["is_active"] is True

    # Verify user exists in db
    result = await db.execute(select(User).where(User.email == "newuser@example.com"))
    user = result.scalars().first()
    assert user is not None
    assert user.email == "newuser@example.com"
    assert security.verify_password("securepassword", user.hashed_password)

async def test_register_duplicate_email(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": test_user.email, "password": "anotherpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "A user with this email already exists"

async def test_register_invalid_email(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "invalid-email", "password": "password"}
    )
    assert response.status_code == 422

async def test_login_success(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

async def test_login_invalid_credentials(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

async def test_refresh_token_success(client: AsyncClient, test_user: User):
    # Log in first to get a refresh token
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"}
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Request new tokens
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

async def test_refresh_token_invalid(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_refresh_token"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"
