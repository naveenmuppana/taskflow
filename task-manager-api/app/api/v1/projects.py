from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api.deps import DBDep, CurrentUserDep
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: DBDep,
    current_user: CurrentUserDep
):
    project = Project(**project_in.model_dump(), owner_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    db: DBDep,
    current_user: CurrentUserDep
):
    result = await db.execute(select(Project).where(Project.owner_id == current_user.id))
    return result.scalars().all()

@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: int,
    db: DBDep,
    current_user: CurrentUserDep
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: DBDep,
    current_user: CurrentUserDep
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
        
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: DBDep,
    current_user: CurrentUserDep
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await db.delete(project)
    await db.commit()
