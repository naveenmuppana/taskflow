from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.core.exceptions import TaskNotFoundException, ForbiddenException

class TaskService:
    @staticmethod
    async def get_tasks(
        db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100
    ) -> list[Task]:
        result = await db.execute(
            select(Task)
            .where(Task.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .order_by(Task.id.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_task_by_id(db: AsyncSession, task_id: int) -> Task | None:
        result = await db.execute(select(Task).where(Task.id == task_id))
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
            owner_id=owner_id
        )
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        return db_task

    @classmethod
    async def update_task(
        cls, db: AsyncSession, task_id: int, task_in: TaskUpdate, owner_id: int
    ) -> Task:
        db_task = await cls.get_task(db, task_id, owner_id)
        
        update_data = task_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_task, field, value)
            
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        return db_task

    @classmethod
    async def delete_task(cls, db: AsyncSession, task_id: int, owner_id: int) -> Task:
        db_task = await cls.get_task(db, task_id, owner_id)
        await db.delete(db_task)
        await db.commit()
        return db_task
