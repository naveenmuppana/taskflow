from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.core.exceptions import ProjectNotFoundException

class ProjectService:
    @staticmethod
    async def get_projects(db: AsyncSession, owner_id: int, skip: int = 0, limit: int = 100) -> list[Project]:
        result = await db.execute(
            select(Project)
            .where(Project.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_project_by_id(db: AsyncSession, project_id: int, owner_id: int) -> Project:
        result = await db.execute(
            select(Project)
            .where(Project.id == project_id, Project.owner_id == owner_id)
        )
        project = result.scalars().first()
        if not project:
            raise ProjectNotFoundException()
        return project

    @classmethod
    async def create_project(cls, db: AsyncSession, project_in: ProjectCreate, owner_id: int) -> Project:
        project = Project(**project_in.model_dump(), owner_id=owner_id)
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @classmethod
    async def update_project(
        cls, db: AsyncSession, project_id: int, project_in: ProjectUpdate, owner_id: int
    ) -> Project:
        project = await cls.get_project_by_id(db, project_id, owner_id)
        update_data = project_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        await db.commit()
        await db.refresh(project)
        return project

    @classmethod
    async def delete_project(cls, db: AsyncSession, project_id: int, owner_id: int) -> None:
        project = await cls.get_project_by_id(db, project_id, owner_id)
        await db.delete(project)
        await db.commit()
