from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.core import security
from app.core.exceptions import (
    UserAlreadyExistsException,
    InvalidCredentialsException,
    TokenInvalidException,
    TokenExpiredException,
    UserNotFoundException
)
import jwt

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @classmethod
    async def register_user(cls, db: AsyncSession, user_in: UserCreate) -> User:
        existing_user = await cls.get_user_by_email(db, user_in.email)
        if existing_user:
            raise UserAlreadyExistsException()
        
        hashed_password = security.get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @classmethod
    async def authenticate_user(cls, db: AsyncSession, email: str, password: str) -> User:
        user = await cls.get_user_by_email(db, email)
        if not user:
            raise InvalidCredentialsException()
        if not user.is_active:
            raise InvalidCredentialsException("User account is inactive")
        if not security.verify_password(password, user.hashed_password):
            raise InvalidCredentialsException()
        return user

    @classmethod
    async def login_user(cls, db: AsyncSession, email: str, password: str) -> Token:
        user = await cls.authenticate_user(db, email, password)
        access_token = security.create_access_token(subject=user.id)
        refresh_token = security.create_refresh_token(subject=user.id)
        return Token(access_token=access_token, refresh_token=refresh_token)

    @classmethod
    async def refresh_tokens(cls, db: AsyncSession, refresh_token: str) -> Token:
        try:
            payload = security.decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise TokenInvalidException("Invalid token type")
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise TokenInvalidException()
            user_id = int(user_id_str)
        except jwt.ExpiredSignatureError:
            raise TokenExpiredException()
        except (jwt.InvalidTokenError, ValueError):
            raise TokenInvalidException()

        user = await cls.get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise UserNotFoundException("User associated with token not found or inactive")

        access_token = security.create_access_token(subject=user.id)
        new_refresh_token = security.create_refresh_token(subject=user.id)
        return Token(access_token=access_token, refresh_token=new_refresh_token)
