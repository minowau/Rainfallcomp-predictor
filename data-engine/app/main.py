from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
import redis.asyncio as redis
from app.core.config import settings

app = FastAPI(title="Climate Correlation Data Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    from app.db.session import init_db, get_session
    from app.api.endpoints import preload_data
    await init_db()
    
    # Pre-load correlation data into memory cache
    async with get_session() as session:
        await preload_data(session)
        
    app.state.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)


@app.on_event("shutdown")
async def shutdown_event():
    await app.state.redis.close()

app.include_router(router)
