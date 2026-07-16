from fastapi import APIRouter, status, Request
from app.api.deps import DBDep, CurrentUserDep
from app.schemas.tag import TagCreate, TagUpdate, TagResponse
from app.services.tag_service import TagService
from app.core.rate_limit import limiter

router = APIRouter()

@router.get(
    "/",
    response_model=list[TagResponse],
    summary="List all tags",
    description="Retrieves a list of all tags owned by the currently authenticated user."
)
@limiter.limit("60/minute")
async def read_tags(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep
):
    return await TagService.get_tags(db, owner_id=current_user.id)

@router.post(
    "/",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new tag"
)
@limiter.limit("60/minute")
async def create_tag(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    tag_in: TagCreate,
):
    return await TagService.create_tag(db, tag_in, owner_id=current_user.id)

@router.put(
    "/{tag_id}",
    response_model=TagResponse,
    summary="Update a tag"
)
@limiter.limit("60/minute")
async def update_tag(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    tag_id: int,
    tag_in: TagUpdate,
):
    return await TagService.update_tag(db, tag_id, tag_in, owner_id=current_user.id)

@router.delete(
    "/{tag_id}",
    response_model=TagResponse,
    summary="Delete a tag"
)
@limiter.limit("60/minute")
async def delete_tag(
    request: Request,
    db: DBDep,
    current_user: CurrentUserDep,
    tag_id: int,
):
    return await TagService.delete_tag(db, tag_id, owner_id=current_user.id)
