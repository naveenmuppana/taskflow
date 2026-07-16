from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.task import TaskStatus, TaskPriority

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
    priority: TaskPriority = Field(
        default=TaskPriority.MEDIUM,
        description="Priority of the task."
    )
    due_date: datetime | None = Field(
        None,
        description="Optional due date for the task."
    )
    category: str | None = Field(
        None,
        max_length=100,
        description="Category of the task."
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
    priority: TaskPriority | None = Field(
        None,
        description="Updated priority of the task."
    )
    due_date: datetime | None = Field(
        None,
        description="Updated due date of the task."
    )
    category: str | None = Field(
        None,
        max_length=100,
        description="Updated category of the task."
    )

class TaskResponse(TaskBase):
    id: int = Field(..., description="Unique identifier for the task.")
    owner_id: int = Field(..., description="ID of the user who owns the task.")
    created_at: datetime = Field(..., description="Creation timestamp.")
    updated_at: datetime = Field(..., description="Last update timestamp.")

    model_config = ConfigDict(from_attributes=True)

class TaskStatsResponse(BaseModel):
    total_tasks: int = Field(..., description="Total number of tasks")
    completed_tasks: int = Field(..., description="Number of completed tasks")
    pending_tasks: int = Field(..., description="Number of pending or in progress tasks")
    overdue_tasks: int = Field(..., description="Number of overdue tasks")
