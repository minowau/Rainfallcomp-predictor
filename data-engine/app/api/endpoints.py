from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_session
import json
import numpy as np
from scipy.stats import pearsonr

router = APIRouter()

def compute_pearson_corr(x, y):
    if len(x) != len(y) or len(x) == 0:
        return 0.0
    mu_x, mu_y = np.mean(x), np.mean(y)
    sigma_x, sigma_y = np.std(x), np.std(y)
    if sigma_x == 0 or sigma_y == 0:
        return 0.0
    return float(np.sum((x - mu_x) * (y - mu_y)) / (len(x) * sigma_x * sigma_y))

@router.get("/regions")
async def get_regions(session: AsyncSession = Depends(get_session)):
    # Returns All Land Grid Points as GeoJSON with names
    sql = """
        SELECT g.id, g.lat, g.lon, ad.name, ad.country
        FROM grid_points g
        LEFT JOIN administrative_divisions ad ON ST_Intersects(g.geom, ad.geom)
    """
    res = await session.execute(text(sql))
    rows = res.all()
    
    features = []
    for row in rows:
        name = row[3] or f"P {round(row[1],1)}, {round(row[2],1)}"
        country = row[4] or "Open Ocean/Territory"
        features.append({
            "type": "Feature",
            "id": row[0],
            "geometry": {
                "type": "Point",
                "coordinates": [float(row[2]), float(row[1])]
            },
            "properties": {
                "id": row[0],
                "name": name,
                "country": country
            }
        })
    return {"type": "FeatureCollection", "features": features}

# Global cache for rainfall data and metadata
RAINFALL_CACHE = {}
METADATA_CACHE = {}
GLOBAL_DATES = []

async def preload_data(session: AsyncSession):
    global RAINFALL_CACHE, METADATA_CACHE
    
    print("Optimization: Preloading rainfall series into memory...")
    
    # Preload Metadata
    sql_meta = """
        SELECT g.id, g.lat, g.lon, ad.name, ad.country
        FROM grid_points g
        LEFT JOIN administrative_divisions ad ON ST_Intersects(g.geom, ad.geom)
    """
    res_metadata = await session.execute(text(sql_meta))
    METADATA_CACHE = {
        row[0]: {
            "lat": row[1], 
            "lon": row[2], 
            "name": row[3] or f"P {round(row[1],1)}, {round(row[2],1)}", 
            "country": row[4] or "Open Ocean/Territory"
        } 
        for row in res_metadata.all()
    }

    # Preload Rainfall Series
    sql = "SELECT region_id, rainfall, time FROM rainfall_series ORDER BY region_id, time"
    res = await session.execute(text(sql))
    rows = res.all()
    
    temp_cache = {}
    dates = []
    first_rid = None
    
    for rid, rain, time in rows:
        if rid not in temp_cache:
            temp_cache[rid] = []
            if first_rid is None:
                first_rid = rid
        temp_cache[rid].append(rain)
        if rid == first_rid:
            dates.append(time.strftime("%Y-%m-%d"))
    
    GLOBAL_DATES = dates
    # Convert to numpy arrays for instant Pearson calculations
    RAINFALL_CACHE = {rid: np.array(series) for rid, series in temp_cache.items()}
    print(f"Cache Ready: {len(RAINFALL_CACHE)} series loaded. Dates: {len(GLOBAL_DATES)}")

async def get_all_point_stats(session: AsyncSession, reference_id: int = None):
    # Use global cache if available, else fallback to one-time preload
    if not RAINFALL_CACHE:
        await preload_data(session)

    if not RAINFALL_CACHE: 
        return None, "No data available."
    
    # If the requested reference is not in our grid (e.g. old ID), 
    # default to a point in Rajasthan (25, 71) or the first available
    if reference_id and reference_id not in RAINFALL_CACHE:
        reference_id = None
        
    if not reference_id:
        # Default to a point near Western Rajasthan [25, 71]
        sql_ref = "SELECT id FROM grid_points WHERE lat > 24 AND lat < 26 AND lon > 70 AND lon < 72 LIMIT 1"
        res_ref = await session.execute(text(sql_ref))
        row_ref = res_ref.first()
        reference_id = row_ref[0] if row_ref else list(RAINFALL_CACHE.keys())[0]

    ref_vals = RAINFALL_CACHE[reference_id]
    
    correlations = []
    for rid, series in RAINFALL_CACHE.items():
        if rid not in METADATA_CACHE: continue
        corr_val = compute_pearson_corr(ref_vals, series)
        
        # Override reference point to be 'neutral' (White) as requested
        if rid == reference_id:
            display_corr = 0.0
            display_type = "Neutral"
        else:
            display_corr = round(corr_val, 3)
            # 5-Class Classification System
            if corr_val >= 0.6:
                display_type = "Strong Similar"
            elif corr_val >= 0.3:
                display_type = "Moderate Similar"
            elif corr_val > -0.3:
                display_type = "Neutral"
            elif corr_val >= -0.6:
                display_type = "Moderate Complementary"
            else:
                display_type = "Strong Complementary"

        meta = METADATA_CACHE[rid]
        correlations.append({
            "region_id": rid,
            "id": rid,
            "name": meta["name"],
            "country": meta["country"],
            "corr": display_corr,
            "intensity": abs(display_corr),
            "lag": 6,
            "type": display_type
        })
    
    return correlations, None

@router.get("/correlation")
async def get_correlation_endpoint(region_id: int = Query(None), session: AsyncSession = Depends(get_session)):
    corrs, err = await get_all_point_stats(session, region_id)
    if err: return {"error": err}
    return corrs

@router.get("/top-complementary")
async def get_top_complementary(region_id: int = Query(None), session: AsyncSession = Depends(get_session)):
    corrs, err = await get_all_point_stats(session, region_id)
    if err: return {"error": err}
    
    comp = sorted([c for c in corrs if c["region_id"] != region_id], key=lambda x: x["corr"])
    return comp[:5]

@router.get("/top-similar")
async def get_top_similar(region_id: int = Query(None), session: AsyncSession = Depends(get_session)):
    corrs, err = await get_all_point_stats(session, region_id)
    if err: return {"error": err}
    
    sim = sorted([c for c in corrs if c["region_id"] != region_id], key=lambda x: x["corr"], reverse=True)
    return sim[:5]
@router.get("/compare")
async def get_comparison(id_a: int, id_b: int):
    if id_a not in RAINFALL_CACHE or id_b not in RAINFALL_CACHE:
        return {"error": "One or both regions not found in cache."}
    
    return {
        "id_a": str(id_a),
        "id_b": str(id_b),
        "dates": GLOBAL_DATES,
        "series_a": RAINFALL_CACHE[id_a].tolist(),
        "series_b": RAINFALL_CACHE[id_b].tolist()
    }
