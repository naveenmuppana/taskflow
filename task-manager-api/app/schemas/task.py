from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.task import TaskStatus

class TaskBase(BaseModel):
    title: str = Field(
        ..., 
        min_length=1, 
        max_length=255,
        description="The title of the task.",
        examples=["Buy groceries"]
    )
    description: str | None = Field(
        None, 
        max_length=1024,
        description="Detailed description of the task.",
        examples=["Milk, Eggs, Bread"]
    )
    status: TaskStatus = Field(
        default=TaskStatus.PENDING,
        description="Current state of the task."
    )

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: str | None = Field(
        None, 
        min_length=1, 
        max_length=255,
        description="New title for the task."
    )
    description: str | None = Field(
        None, 
        max_length=1024,
        description="New detailed description."
    )
    status: TaskStatus | None = Field(
        None,
        description="Updated state of the task."
    )

class TaskResponse(TaskBase):
    id: int = Field(..., description="Unique identifier for the task.")
    owner_id: int = Field(..., description="ID of the user who owns this task.")
    created_at: datetime = Field(..., description="Timestamp when the task was created.")
    updated_at: datetime = Field(..., description="Timestamp when the task was last updated.")
    
    model_config = ConfigDict(from_attributes=True)
