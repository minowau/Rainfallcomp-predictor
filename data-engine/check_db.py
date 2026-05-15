import asyncio
from app.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.begin() as conn:
        print("Total Grid Points:", (await conn.execute(text("SELECT count(*) FROM grid_points"))).scalar())
        print("Total Rainfall Records:", (await conn.execute(text("SELECT count(*) FROM rainfall_series"))).scalar())
        
        wr_pts = (await conn.execute(text("SELECT id, lat, lon FROM grid_points WHERE lat BETWEEN 24 AND 28 AND lon BETWEEN 70 AND 75"))).all()
        print("West Rajasthan Points:", wr_pts)
        
        if wr_pts:
            ids = [f"{pt[0]}" for pt in wr_pts]
            wr_rain = (await conn.execute(text(f"SELECT count(*) FROM rainfall_series WHERE region_id IN ({','.join(ids)})"))).scalar()
            print(f"Rainfall records for WR IDs ({ids}): {wr_rain}")
            
            # See a few actual records
            one_id = ids[0]
            sample = (await conn.execute(text(f"SELECT time, rainfall FROM rainfall_series WHERE region_id = {one_id} LIMIT 3"))).all()
            print(f"Sample rainfall for ID {one_id}: {sample}")

if __name__ == "__main__":
    asyncio.run(check())
