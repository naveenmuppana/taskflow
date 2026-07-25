from typing import List
from fastapi import APIRouter, status
from app.api.deps import DBDep, CurrentUserDep, PaginationDep
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: DBDep,
    current_user: CurrentUserDep
):
    return await ProjectService.create_project(db, project_in, current_user.id)

@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    db: DBDep,
    current_user: CurrentUserDep,
    pagination: PaginationDep
):
    return await ProjectService.get_projects(db, current_user.id, skip=pagination.skip, limit=pagination.limit)

@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: int,
    db: DBDep,
    current_user: CurrentUserDep
):
    return await ProjectService.get_project_by_id(db, project_id, current_user.id)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: DBDep,
    current_user: CurrentUserDep
):
    return await ProjectService.update_project(db, project_id, project_in, current_user.id)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: DBDep,
    current_user: CurrentUserDep
):
    await ProjectService.delete_project(db, project_id, current_user.id)
