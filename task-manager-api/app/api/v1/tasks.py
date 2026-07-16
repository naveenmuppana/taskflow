from fastapi import APIRouter, status, Request

from app.api.deps import DBDep, CurrentUserDep, PaginationDep
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStatsResponse
from app.services.task_service import TaskService
from app.core.rate_limit import limiter

router = APIRouter()

from app.models.task import TaskStatus, TaskPriority

@router.get(
    "/stats",
    response_model=TaskStatsResponse,
    summary="Get task statistics",
    description="Retrieves counts for total, completed, pending, and overdue tasks."
)
async def get_task_stats(
    db: DBDep,
    current_user: CurrentUserDep
):
    return await TaskService.get_task_stats(db, owner_id=current_user.id)

@router.get(
    "/", 
    response_model=list[TaskResponse],
    summary="List all tasks",
    description="Retrieves a paginated list of all tasks owned by the currently authenticated user. Supports searching, filtering, and sorting.",
    response_description="A list of task objects"
)
@limiter.limit("60/minute")
async def read_tasks(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    pagination: PaginationDep,
    search: str | None = None,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    category: str | None = None,
    sort_by: str = "newest"
):
    return await TaskService.get_tasks(
        db, 
        owner_id=current_user.id, 
        skip=pagination.skip, 
        limit=pagination.limit,
        search=search,
        status=status,
        priority=priority,
        category=category,
        sort_by=sort_by
    )

@router.post(
    "/", 
    response_model=TaskResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
    description="Creates a new task with a title and optional description. By default, the task is marked as PENDING.",
    response_description="The newly created task object"
)
@limiter.limit("60/minute")
async def create_task(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    task_in: TaskCreate,
):
    return await TaskService.create_task(db, task_in, owner_id=current_user.id)

@router.get(
    "/{task_id}", 
    response_model=TaskResponse,
    summary="Get a specific task",
    description="Retrieves the details of a specific task by its ID. Users can only fetch tasks they own.",
    response_description="The task object"
)
@limiter.limit("60/minute")
async def read_task(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    task_id: int,
):
    return await TaskService.get_task(db, task_id, owner_id=current_user.id)

@router.put(
    "/{task_id}", 
    response_model=TaskResponse,
    summary="Update a task",
    description="Updates the title, description, or status of an existing task owned by the user.",
    response_description="The updated task object"
)
@limiter.limit("60/minute")
async def update_task(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    task_id: int,
    task_in: TaskUpdate,
):
    return await TaskService.update_task(
        db, 
        task_id, 
        task_in, 
        owner_id=current_user.id
    )

@router.delete(
    "/{task_id}", 
    response_model=TaskResponse,
    summary="Delete a task",
    description="Permanently deletes a specific task owned by the user.",
    response_description="The deleted task object details"
)
@limiter.limit("60/minute")
async def delete_task(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    task_id: int,
):
    return await TaskService.delete_task(db, task_id, owner_id=current_user.id)
