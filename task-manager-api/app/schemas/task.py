from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from app.models.task import TaskStatus, TaskPriority

class TaskBase(BaseModel):
    title: str = Field(..., title="Title", description="The title of the task", min_length=1, max_length=255, examples=["Buy groceries"])
    description: Optional[str] = Field(None, title="Description", description="A detailed description of the task", max_length=1024, examples=["Milk, eggs, and bread"])
    status: Optional[TaskStatus] = Field(default=TaskStatus.PENDING, title="Status", description="The current status of the task")
    priority: Optional[TaskPriority] = Field(default=TaskPriority.MEDIUM, title="Priority", description="Urgency of the task")
    due_date: Optional[datetime] = Field(None, title="Due Date", description="When the task needs to be completed")
    category_id: Optional[int] = Field(None, title="Category ID", description="The category this task belongs to")
    project_id: Optional[int] = Field(None, title="Project ID", description="The project this task belongs to")
    is_archived: Optional[bool] = Field(default=False, title="Archived", description="Whether the task is archived")

class TaskCreate(TaskBase):
    tag_ids: Optional[List[int]] = Field(default=None, title="Tag IDs", description="List of tag IDs to associate with the task")

class TaskUpdate(TaskBase):
    tag_ids: Optional[List[int]] = Field(default=None, title="Tag IDs", description="List of tag IDs to associate with the task")

class TaskInDBBase(TaskBase):
    id: int = Field(..., title="ID", description="Unique identifier for the task", examples=[1])
    owner_id: int = Field(..., title="Owner ID", description="ID of the user who owns this task", examples=[42])
    created_at: datetime = Field(..., title="Created At", description="When the task was created")
    updated_at: datetime = Field(..., title="Updated At", description="When the task was last updated")
    
    model_config = ConfigDict(from_attributes=True)

from app.schemas.category import CategoryResponse
from app.schemas.tag import TagResponse
from app.schemas.subtask import SubtaskResponse

class TaskResponse(TaskInDBBase):
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []
    subtasks: List[SubtaskResponse] = []

class TaskStatsResponse(BaseModel):
    total_tasks: int = Field(..., description="Total unarchived tasks")
    completed_tasks: int = Field(..., description="Completed unarchived tasks")
    pending_tasks: int = Field(..., description="Pending or in-progress tasks")
    overdue_tasks: int = Field(..., description="Tasks past their due date that are not completed")
