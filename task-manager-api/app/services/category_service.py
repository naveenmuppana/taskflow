from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.core.exceptions import ForbiddenException
from fastapi import HTTPException, status

class CategoryService:
    @staticmethod
    async def get_categories(db: AsyncSession, owner_id: int) -> list[Category]:
        result = await db.execute(select(Category).where(Category.owner_id == owner_id).order_by(Category.name))
        return list(result.scalars().all())

    @staticmethod
    async def get_category(db: AsyncSession, category_id: int, owner_id: int) -> Category:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalars().first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        if category.owner_id != owner_id:
            raise ForbiddenException("You do not have permission to access this category")
        return category

    @classmethod
    async def create_category(cls, db: AsyncSession, category_in: CategoryCreate, owner_id: int) -> Category:
        db_category = Category(
            name=category_in.name,
            color=category_in.color,
            owner_id=owner_id
        )
        db.add(db_category)
        await db.commit()
        await db.refresh(db_category)
        return db_category

    @classmethod
    async def update_category(cls, db: AsyncSession, category_id: int, category_in: CategoryUpdate, owner_id: int) -> Category:
        db_category = await cls.get_category(db, category_id, owner_id)
        
        update_data = category_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_category, field, value)
            
        db.add(db_category)
        await db.commit()
        await db.refresh(db_category)
        return db_category

    @classmethod
    async def delete_category(cls, db: AsyncSession, category_id: int, owner_id: int) -> Category:
        db_category = await cls.get_category(db, category_id, owner_id)
        await db.delete(db_category)
        await db.commit()
        return db_category
