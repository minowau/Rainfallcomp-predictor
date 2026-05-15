import asyncio
import sys
import os
from sqlalchemy import text

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine

async def debug():
    async with engine.begin() as conn:
        print("--- DATABASE DEBUG ---")
        try:
            div_count = (await conn.execute(text("SELECT count(*) FROM administrative_divisions"))).scalar()
            print(f"Administrative Divisions: {div_count}")
            
            corr_count = (await conn.execute(text("SELECT count(*) FROM correlation_results"))).scalar()
            print(f"Correlation Results: {corr_count}")
            
            div_corr_count = (await conn.execute(text("SELECT count(*) FROM correlation_results WHERE division_id IS NOT NULL"))).scalar()
            print(f"Correlation Results with division_id: {div_corr_count}")
            
            if div_corr_count > 0:
                sample = (await conn.execute(text("SELECT * FROM correlation_results WHERE division_id IS NOT NULL LIMIT 1"))).fetchone()
                print(f"Sample Corr Result: {sample}")
        except Exception as e:
            print(f"Error checking DB: {e}")

if __name__ == "__main__":
    asyncio.run(debug())
