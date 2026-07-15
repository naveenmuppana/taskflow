from typing import Annotated
from fastapi import APIRouter, Depends, status, Request
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DBDep
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token, TokenRefreshRequest
from app.services.auth_service import AuthService
from app.core.rate_limit import limiter

router = APIRouter()

@router.post(
    "/register", 
    response_model=UserResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Creates a new user account with an email and password. Fails if the email is already registered.",
    response_description="The newly created user profile"
)
@limiter.limit("5/minute")
async def register(request: Request, db: DBDep, user_in: UserCreate):
    return await AuthService.register_user(db, user_in)

@router.post(
    "/login", 
    response_model=Token,
    summary="Login user (OAuth2)",
    description="Authenticates a user via email and password using the standard OAuth2 Password flow. Returns an access token and a refresh token.",
    response_description="JWT access and refresh tokens"
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    db: DBDep, 
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    return await AuthService.login_user(
        db, 
        email=form_data.username, 
        password=form_data.password
    )

@router.post(
    "/refresh", 
    response_model=Token,
    summary="Refresh access tokens",
    description="Uses a valid refresh token to generate a new pair of access and refresh tokens.",
    response_description="A new set of JWT access and refresh tokens"
)
@limiter.limit("10/minute")
async def refresh_token(request: Request, db: DBDep, body: TokenRefreshRequest):
    return await AuthService.refresh_tokens(db, refresh_token=body.refresh_token)
