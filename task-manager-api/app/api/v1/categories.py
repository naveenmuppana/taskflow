from fastapi import APIRouter, status, Request
from app.api.deps import DBDep, CurrentUserDep
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import CategoryService
from app.core.rate_limit import limiter

router = APIRouter()

@router.get(
    "/",
    response_model=list[CategoryResponse],
    summary="List all categories",
    description="Retrieves a list of all categories owned by the currently authenticated user."
)
@limiter.limit("60/minute")
async def read_categories(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep
):
    return await CategoryService.get_categories(db, owner_id=current_user.id)

@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category"
)
@limiter.limit("60/minute")
async def create_category(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    category_in: CategoryCreate,
):
    return await CategoryService.create_category(db, category_in, owner_id=current_user.id)

@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Update a category"
)
@limiter.limit("60/minute")
async def update_category(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    category_id: int,
    category_in: CategoryUpdate,
):
    return await CategoryService.update_category(db, category_id, category_in, owner_id=current_user.id)

@router.delete(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Delete a category"
)
@limiter.limit("60/minute")
async def delete_category(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    category_id: int,
):
    return await CategoryService.delete_category(db, category_id, owner_id=current_user.id)
