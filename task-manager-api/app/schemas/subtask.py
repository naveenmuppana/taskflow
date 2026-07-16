from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class SubtaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    is_completed: bool = False

class SubtaskCreate(SubtaskBase):
    task_id: int

class SubtaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    is_completed: bool | None = None

class SubtaskResponse(SubtaskBase):
    id: int
    task_id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
