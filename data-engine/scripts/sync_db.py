import asyncio
import sys
import os
from sqlalchemy import text

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine, init_db

async def sync():
    async with engine.begin() as conn:
        print("Dropping existing tables to force schema sync...")
        # We need to drop in order of dependencies
        await conn.execute(text("DROP TABLE IF EXISTS correlation_results CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS rainfall_series CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS grid_points CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS administrative_divisions CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS user_regions CASCADE"))
        print("Schema cleared.")
    
    print("Running init_db to recreate tables...")
    await init_db()
    print("Database synced successfully.")

if __name__ == "__main__":
    asyncio.run(sync())
