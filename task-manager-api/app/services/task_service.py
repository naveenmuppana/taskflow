from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, desc, asc, func, case, and_
from datetime import datetime, timezone, timedelta
import calendar
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.tag import Tag
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatsResponse
from app.core.exceptions import TaskNotFoundException, ForbiddenException

class TaskService:
    @staticmethod
    async def get_tasks(
        db: AsyncSession, 
        owner_id: int, 
        skip: int = 0, 
        limit: int = 100,
        search: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        category_id: int | None = None,
        project_id: int | None = None,
        sort_by: str = "newest"
    ) -> list[Task]:
        query = select(Task).options(
            selectinload(Task.category), 
            selectinload(Task.tags), 
            selectinload(Task.subtasks), 
            selectinload(Task.project)
        ).where(Task.owner_id == owner_id, Task.is_archived == False)
        
        if search:
            query = query.where(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if category_id is not None:
            query = query.where(Task.category_id == category_id)
        if project_id is not None:
            query = query.where(Task.project_id == project_id)
            
        if sort_by == "oldest":
            query = query.order_by(asc(Task.created_at))
        elif sort_by == "due_date":
            query = query.order_by(Task.due_date.is_(None), asc(Task.due_date))
        elif sort_by == "priority":
            query = query.order_by(desc(Task.priority))
        elif sort_by == "alphabetically":
            query = query.order_by(asc(Task.title))
        else:
            query = query.order_by(desc(Task.created_at))

        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_task_stats(db: AsyncSession, owner_id: int) -> TaskStatsResponse:
        query = select(
            func.count(Task.id).label("total"),
            func.count(case((Task.status == TaskStatus.COMPLETED, 1))).label("completed"),
            func.count(case((Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]), 1))).label("pending"),
            func.count(case((and_(Task.status != TaskStatus.COMPLETED, Task.due_date < func.now()), 1))).label("overdue"),
        ).where(Task.owner_id == owner_id, Task.is_archived == False)

        result = await db.execute(query)
        row = result.one()
        return TaskStatsResponse(
            total_tasks=row.total or 0,
            completed_tasks=row.completed or 0,
            pending_tasks=row.pending or 0,
            overdue_tasks=row.overdue or 0
        )

    @staticmethod
    async def get_task_by_id(db: AsyncSession, task_id: int) -> Task | None:
        result = await db.execute(
            select(Task).options(
                selectinload(Task.category), 
                selectinload(Task.tags), 
                selectinload(Task.subtasks), 
                selectinload(Task.project)
            ).where(Task.id == task_id, Task.is_archived == False)
        )
        return result.scalars().first()

    @classmethod
    async def get_task(cls, db: AsyncSession, task_id: int, owner_id: int) -> Task:
        task = await cls.get_task_by_id(db, task_id)
        if not task:
            raise TaskNotFoundException()
        if task.owner_id != owner_id:
            raise ForbiddenException("You do not have permission to access this task")
        return task

    @classmethod
    async def create_task(
        cls, db: AsyncSession, task_in: TaskCreate, owner_id: int
    ) -> Task:
        db_task = Task(
            title=task_in.title,
            description=task_in.description,
            status=task_in.status,
            priority=task_in.priority,
            due_date=task_in.due_date,
            category_id=task_in.category_id,
            project_id=task_in.project_id,
            is_archived=task_in.is_archived,
            owner_id=owner_id
        )
        if task_in.tag_ids:
            tags_result = await db.execute(select(Tag).where(Tag.id.in_(task_in.tag_ids), Tag.owner_id == owner_id))
            db_task.tags = list(tags_result.scalars().all())

        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        
        result = await db.execute(
            select(Task).options(
                selectinload(Task.category), 
                selectinload(Task.tags), 
                selectinload(Task.subtasks), 
                selectinload(Task.project)
            ).where(Task.id == db_task.id)
        )
        return result.scalars().first()

    @classmethod
    async def update_task(
        cls, db: AsyncSession, task_id: int, task_in: TaskUpdate, owner_id: int
    ) -> Task:
        db_task = await cls.get_task(db, task_id, owner_id)
        
        # Check if marking as completed for the first time
        was_completed = db_task.status == TaskStatus.COMPLETED
        will_be_completed = task_in.status == TaskStatus.COMPLETED if task_in.status else False
        
        update_data = task_in.model_dump(exclude_unset=True)
        if "tag_ids" in update_data:
            tag_ids = update_data.pop("tag_ids")
            if tag_ids:
                tags_result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids), Tag.owner_id == owner_id))
                db_task.tags = list(tags_result.scalars().all())
            else:
                db_task.tags = []

        for field, value in update_data.items():
            setattr(db_task, field, value)
            
        db.add(db_task)
        
        if not was_completed and will_be_completed and getattr(db_task, "is_recurring", False) and getattr(db_task, "recurrence_rule", None):
            # Calculate next due date
            next_due_date = None
            if db_task.due_date:
                rule = db_task.recurrence_rule.lower()
                if rule == 'daily':
                    next_due_date = db_task.due_date + timedelta(days=1)
                elif rule == 'weekly':
                    next_due_date = db_task.due_date + timedelta(weeks=1)
                elif rule == 'monthly':
                    month = db_task.due_date.month
                    year = db_task.due_date.year
                    if month == 12:
                        month = 1
                        year += 1
                    else:
                        month += 1
                    last_day_of_new_month = calendar.monthrange(year, month)[1]
                    day = min(db_task.due_date.day, last_day_of_new_month)
                    next_due_date = db_task.due_date.replace(year=year, month=month, day=day)
                elif rule == 'yearly':
                    year = db_task.due_date.year + 1
                    if db_task.due_date.month == 2 and db_task.due_date.day == 29 and not calendar.isleap(year):
                        next_due_date = db_task.due_date.replace(year=year, month=2, day=28)
                    else:
                        next_due_date = db_task.due_date.replace(year=year)
            else:
                next_due_date = datetime.now(timezone.utc)
            
            # Spawn new recurring task
            new_task = Task(
                title=db_task.title,
                description=db_task.description,
                status=TaskStatus.PENDING,
                priority=db_task.priority,
                due_date=next_due_date,
                remind_at=None,
                category_id=db_task.category_id,
                project_id=db_task.project_id,
                is_archived=db_task.is_archived,
                owner_id=owner_id,
                is_recurring=True,
                recurrence_rule=db_task.recurrence_rule
            )
            if hasattr(db_task, 'tags') and db_task.tags:
                new_task.tags = db_task.tags[:]
            db.add(new_task)

        await db.commit()
        
        # Reload with relationships
        result = await db.execute(
            select(Task).options(
                selectinload(Task.category), 
                selectinload(Task.tags), 
                selectinload(Task.subtasks), 
                selectinload(Task.project)
            ).where(Task.id == db_task.id)
        )
        return result.scalars().first()

    @classmethod
    async def delete_task(cls, db: AsyncSession, task_id: int, owner_id: int) -> None:
        db_task = await cls.get_task(db, task_id, owner_id)
        await db.delete(db_task)
        await db.commit()

