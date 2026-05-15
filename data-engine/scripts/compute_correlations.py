import asyncio
import sys
import os
import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sqlalchemy import text, insert

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine, async_session
from app.db.models import GridPoint, RainfallSeries, CorrelationResult, AdministrativeDivision

async def compute_global_correlations():
    async with async_session() as session:
        print("Fetching Reference Rainfall (West Rajasthan)...")
        # Use a 1-degree point at (25, 70) as baseline
        sql_ref = """
            SELECT time, AVG(rainfall) as avg_rain
            FROM rainfall_series rs
            JOIN grid_points g ON rs.region_id = g.id
            WHERE g.lat BETWEEN 24 AND 26 AND g.lon BETWEEN 70 AND 72
            GROUP BY time
            ORDER BY time
        """
        res_ref = await session.execute(text(sql_ref))
        ref_data = res_ref.all()
        ref_series = pd.Series([row[1] for row in ref_data])
        
        if len(ref_series) == 0:
            print("No reference series data.")
            return

        print("Fetching Global Rainfall In-Memory for Vectorization...")
        sql_all = """
            SELECT region_id, rainfall 
            FROM rainfall_series 
            ORDER BY region_id, time
        """
        res_all = await session.execute(text(sql_all))
        all_data = res_all.all()
        
        print("Converting to matrix...")
        all_vals = np.array([row[1] for row in all_data]).reshape(-1, 132)
        all_ids = np.unique([row[0] for row in all_data])

        print("Computing Vectorized Correlations...")
        ref_vals = ref_series.values
        ref_mu = np.mean(ref_vals)
        ref_sigma = np.std(ref_vals)
        
        target_mu = np.mean(all_vals, axis=1).reshape(-1, 1)
        target_sigma = np.std(all_vals, axis=1).reshape(-1, 1)
        
        n = 132
        corrs = np.sum((all_vals - target_mu) * (ref_vals - ref_mu), axis=1) / (n * target_sigma.flatten() * ref_sigma)
        
        results = []
        for i, val in enumerate(corrs):
            best_corr = float(val) if not np.isnan(val) else 0.0
            intensity = abs(best_corr)
            c_type = "positive" if best_corr > 0.3 else ("complementary" if best_corr < -0.3 else "neutral")
            
            results.append({
                'region_id': int(all_ids[i]),
                'division_id': None, # Must be explicit for bulk insert
                'corr': best_corr,
                'lag': 0,
                'type': c_type,
                'intensity': intensity
            })

        print(f"Computed {len(results)} global grid correlations.")

        print("Processing Administrative Divisions (Tehsils)...")
        res_divs = await session.execute(text("SELECT id, name FROM administrative_divisions"))
        divisions = res_divs.all()
        
        for div_id, div_name in divisions:
            sql_div_pts = """
                SELECT g.id
                FROM grid_points g
                JOIN administrative_divisions ad ON ST_Intersects(g.geom, ad.geom)
                WHERE ad.id = :div_id
            """
            res_div_pts = await session.execute(text(sql_div_pts), {"div_id": div_id})
            div_pts_ids = [row[0] for row in res_div_pts.all()]
            
            if not div_pts_ids: continue
            
            # Simple average of grid point correlations
            div_corrs = [r['corr'] for r in results if r.get('region_id') in div_pts_ids]
            if not div_corrs: continue
            
            avg_corr = sum(div_corrs) / len(div_corrs)
            best_corr = float(avg_corr)
            intensity = abs(best_corr)
            c_type = "positive" if best_corr > 0.3 else ("complementary" if best_corr < -0.3 else "neutral")

            results.append({
                'region_id': None, # Must be explicit for bulk insert
                'division_id': div_id,
                'corr': best_corr,
                'lag': 0,
                'type': c_type,
                'intensity': intensity
            })

        print(f"Saving {len(results)} total correlations (Grid + Divisions)...")
        await session.execute(text("TRUNCATE TABLE correlation_results CASCADE"))
        
        chunk_size = 5000
        for i in range(0, len(results), chunk_size):
            chunk = results[i:i+chunk_size]
            await session.execute(insert(CorrelationResult).values(chunk))
            
        await session.commit()
        print("Global Correlation Computation Complete.")

if __name__ == "__main__":
    asyncio.run(compute_global_correlations())
