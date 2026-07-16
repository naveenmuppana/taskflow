import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, func, Enum, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

task_dependencies = Table(
    "task_dependencies",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("depends_on_task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
)

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.category import Category
    from app.models.tag import Tag
    from app.models.subtask import Subtask
    from app.models.project import Project
    from app.models.time_entry import TimeEntry

class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Task(Base):
    __tablename__ = "tasks"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), 
        default=TaskStatus.PENDING, 
        nullable=False
    )
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority),
        default=TaskPriority.MEDIUM,
        nullable=False
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    is_archived: Mapped[bool] = mapped_column(default=False, nullable=False, index=True, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner: Mapped["User"] = relationship(back_populates="tasks")
    category: Mapped["Category"] = relationship(back_populates="tasks")
    tags: Mapped[list["Tag"]] = relationship(
        secondary="task_tags", back_populates="tasks"
    )
    subtasks: Mapped[list["Subtask"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    project: Mapped["Project"] = relationship(back_populates="tasks")
    
    dependencies: Mapped[list["Task"]] = relationship(
        "Task",
        secondary=task_dependencies,
        primaryjoin=id == task_dependencies.c.task_id,
        secondaryjoin=id == task_dependencies.c.depends_on_task_id,
        backref="blocks"
    )
    time_entries: Mapped[list["TimeEntry"]] = relationship(back_populates="task", cascade="all, delete-orphan")
