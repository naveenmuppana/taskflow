import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(text('DROP TABLE IF EXISTS time_entries'))
        await conn.execute(text('DROP TABLE IF EXISTS task_dependencies'))
        await conn.execute(text('DROP TABLE IF EXISTS projects'))
        await conn.commit()

asyncio.run(main())
