from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/climate_data"

# Create Database engine
engine = create_async_engine(DATABASE_URL, echo=False)

# Create a sessionmaker
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # We need to verify postgis and timescaledb are active in this DB
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb;"))
        
        # Then create all tables
        from app.db.models import Base
        await conn.run_sync(Base.metadata.create_all)
        
        # Turn rainfall_series into a hypertable
        try:
            await conn.execute(text("SELECT create_hypertable('rainfall_series', 'time', if_not_exists => TRUE);"))
        except Exception as e:
            # Hypertable already exists or error
            print(f"Hypertable creation: {e}")
