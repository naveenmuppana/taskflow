from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate

class TagService:
    @staticmethod
    async def get_tags(db: AsyncSession, owner_id: int) -> list[Tag]:
        query = select(Tag).where(Tag.owner_id == owner_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_tag(db: AsyncSession, tag_id: int, owner_id: int) -> Tag:
        query = select(Tag).where(Tag.id == tag_id, Tag.owner_id == owner_id)
        result = await db.execute(query)
        tag = result.scalar_one_or_none()
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        return tag

    @staticmethod
    async def create_tag(db: AsyncSession, tag_in: TagCreate, owner_id: int) -> Tag:
        # Check if tag with same name exists for this user
        query = select(Tag).where(Tag.name == tag_in.name, Tag.owner_id == owner_id)
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tag with this name already exists"
            )

        db_tag = Tag(**tag_in.model_dump(), owner_id=owner_id)
        db.add(db_tag)
        await db.commit()
        await db.refresh(db_tag)
        return db_tag

    @staticmethod
    async def update_tag(db: AsyncSession, tag_id: int, tag_in: TagUpdate, owner_id: int) -> Tag:
        db_tag = await TagService.get_tag(db, tag_id, owner_id)
        
        update_data = tag_in.model_dump(exclude_unset=True)
        
        if "name" in update_data and update_data["name"] != db_tag.name:
            # Check for name collision
            query = select(Tag).where(Tag.name == update_data["name"], Tag.owner_id == owner_id)
            result = await db.execute(query)
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tag with this name already exists"
                )

        for field, value in update_data.items():
            setattr(db_tag, field, value)

        await db.commit()
        await db.refresh(db_tag)
        return db_tag

    @staticmethod
    async def delete_tag(db: AsyncSession, tag_id: int, owner_id: int) -> Tag:
        db_tag = await TagService.get_tag(db, tag_id, owner_id)
        await db.delete(db_tag)
        await db.commit()
        return db_tag
