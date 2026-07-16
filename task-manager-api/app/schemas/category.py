from pydantic import BaseModel, Field
from datetime import datetime

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    color: str = Field(default="#808080", max_length=20)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    color: str | None = Field(None, max_length=20)

class CategoryResponse(CategoryBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True
