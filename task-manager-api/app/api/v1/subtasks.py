from fastapi import APIRouter, status, Request
from app.api.deps import DBDep, CurrentUserDep
from app.schemas.subtask import SubtaskCreate, SubtaskUpdate, SubtaskResponse
from app.services.subtask_service import SubtaskService
from app.core.rate_limit import limiter

router = APIRouter()

@router.get(
    "/task/{task_id}",
    response_model=list[SubtaskResponse],
    summary="List subtasks for a task"
)
@limiter.limit("60/minute")
async def read_subtasks(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    task_id: int
):
    return await SubtaskService.get_subtasks(db, task_id, owner_id=current_user.id)

@router.post(
    "/",
    response_model=SubtaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new subtask"
)
@limiter.limit("60/minute")
async def create_subtask(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    subtask_in: SubtaskCreate,
):
    return await SubtaskService.create_subtask(db, subtask_in, owner_id=current_user.id)

@router.put(
    "/{subtask_id}",
    response_model=SubtaskResponse,
    summary="Update a subtask"
)
@limiter.limit("60/minute")
async def update_subtask(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    subtask_id: int,
    subtask_in: SubtaskUpdate,
):
    return await SubtaskService.update_subtask(db, subtask_id, subtask_in, owner_id=current_user.id)

@router.delete(
    "/{subtask_id}",
    response_model=SubtaskResponse,
    summary="Delete a subtask"
)
@limiter.limit("60/minute")
async def delete_subtask(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    subtask_id: int,
):
    return await SubtaskService.delete_subtask(db, subtask_id, owner_id=current_user.id)
