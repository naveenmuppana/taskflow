from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subtask import Subtask
from app.models.task import Task
from app.schemas.subtask import SubtaskCreate, SubtaskUpdate

class SubtaskService:
    @staticmethod
    async def get_subtasks(db: AsyncSession, task_id: int, owner_id: int) -> list[Subtask]:
        # Check if user owns the task first
        query = select(Task).where(Task.id == task_id, Task.owner_id == owner_id)
        result = await db.execute(query)
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        query = select(Subtask).where(Subtask.task_id == task_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_subtask(db: AsyncSession, subtask_in: SubtaskCreate, owner_id: int) -> Subtask:
        # Check task exists and owned by user
        query = select(Task).where(Task.id == subtask_in.task_id, Task.owner_id == owner_id)
        result = await db.execute(query)
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        db_subtask = Subtask(**subtask_in.model_dump(), owner_id=owner_id)
        db.add(db_subtask)
        await db.commit()
        await db.refresh(db_subtask)
        return db_subtask

    @staticmethod
    async def update_subtask(db: AsyncSession, subtask_id: int, subtask_in: SubtaskUpdate, owner_id: int) -> Subtask:
        query = select(Subtask).where(Subtask.id == subtask_id, Subtask.owner_id == owner_id)
        result = await db.execute(query)
        db_subtask = result.scalar_one_or_none()
        if not db_subtask:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subtask not found"
            )
        
        update_data = subtask_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_subtask, field, value)

        await db.commit()
        await db.refresh(db_subtask)
        return db_subtask

    @staticmethod
    async def delete_subtask(db: AsyncSession, subtask_id: int, owner_id: int) -> Subtask:
        query = select(Subtask).where(Subtask.id == subtask_id, Subtask.owner_id == owner_id)
        result = await db.execute(query)
        db_subtask = result.scalar_one_or_none()
        if not db_subtask:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subtask not found"
            )
        
        await db.delete(db_subtask)
        await db.commit()
        return db_subtask
