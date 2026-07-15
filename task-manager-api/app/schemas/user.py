from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="The user's email address.", examples=["user@example.com"])
    is_active: bool = Field(default=True, description="Whether the user account is active.")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="The user's secure password.", examples=["StrongPassword123!"])

class UserUpdate(BaseModel):
    email: EmailStr | None = Field(None, description="New email address for the user.")
    is_active: bool | None = Field(None, description="Update the user's active status.")
    password: str | None = Field(None, min_length=8, description="New password.")

class UserResponse(UserBase):
    id: int = Field(..., description="Unique identifier for the user.")
    created_at: datetime = Field(..., description="Timestamp when the user registered.")
    updated_at: datetime = Field(..., description="Timestamp when the user profile was last updated.")
    
    model_config = ConfigDict(from_attributes=True)
