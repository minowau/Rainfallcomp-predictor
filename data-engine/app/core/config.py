class Settings:
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/climate_data"
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_EXPIRATION: int = 3600  # 1 hour

settings = Settings()
