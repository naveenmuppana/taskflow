from typing import Annotated
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from app.core import security
from app.core.config import settings
from app.core.exceptions import (
    TokenInvalidException,
    TokenExpiredException,
    UserNotFoundException
)
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

DBDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]

async def get_current_user(db: DBDep, token: TokenDep) -> User:
    try:
        payload = security.decode_token(token)
        if payload.get("type") != "access":
            raise TokenInvalidException("Invalid token type")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise TokenInvalidException()
        user_id = int(user_id_str)
    except jwt.ExpiredSignatureError:
        raise TokenExpiredException()
    except (jwt.InvalidTokenError, ValueError):
        raise TokenInvalidException()
        
    user = await AuthService.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException("User not found")
    if not user.is_active:
        raise UserNotFoundException("User account is inactive")
    return user

CurrentUserDep = Annotated[User, Depends(get_current_user)]

class PaginationParams:
    def __init__(self, skip: int = 0, limit: int = 100):
        self.skip = skip
        self.limit = limit

PaginationDep = Annotated[PaginationParams, Depends()]
