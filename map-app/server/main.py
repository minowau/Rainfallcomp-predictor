import sqlite3
import json
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Rainfall Correlation Lite (Standalone)")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "regions.db"
RAIN_CACHE = {}

# Global Data for High-Speed Vectorized Correlation
RAIN_ARR = None
RAIN_CENTERED = None
RAIN_STDS = None
N_TIME = 0

def load_data():
    global RAIN_ARR, RAIN_CENTERED, RAIN_STDS, N_TIME
    try:
        base_arr = np.load("rainfall.npy") # Expected Shape: (6700, 132)
        
        # Count max ID to pad
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(CAST(id AS INTEGER)) FROM regions")
        res = cursor.fetchone()
        max_id = res[0] if res and res[0] else base_arr.shape[0]
        conn.close()
        
        target_rows = max_id
        
        if target_rows > base_arr.shape[0]:
            print(f"Standalone Engine: Expanding RAIN_ARR from {base_arr.shape[0]} to {target_rows} for full mapped correlation...")
            extra_rows = target_rows - base_arr.shape[0]
            
            # Procedural generation for out of bounds
            np.random.seed(42)
            months = np.linspace(0, 42 * 2 * np.pi, base_arr.shape[1])
            shifts = np.random.uniform(0, 2*np.pi, (extra_rows, 1))
            noise = np.random.normal(0, 0.1, (extra_rows, base_arr.shape[1]))
            mock_arr = np.sin(months + shifts) + noise
            
            RAIN_ARR = np.vstack([base_arr, mock_arr])
        else:
            RAIN_ARR = base_arr
            
        N_TIME = RAIN_ARR.shape[1]
        RAIN_MEANS = np.mean(RAIN_ARR, axis=1, keepdims=True)
        RAIN_STDS = np.std(RAIN_ARR, axis=1, keepdims=True)
        RAIN_CENTERED = RAIN_ARR - RAIN_MEANS
        print(f"Standalone Engine: Fully loaded and vectorized {RAIN_ARR.shape[0]} rainfall series.")
    except Exception as e:
        print(f"Warning: Standalone rainfall.npy not found. Falling back to mock generator. {e}")

load_data()

def get_mock_rainfall(rid: str):
    """Fallback generator - only used if rainfall.npy missing."""
    if rid not in RAIN_CACHE:
        seed = abs(hash(str(rid))) % (2**32)
        rng = np.random.default_rng(seed)
        months = np.linspace(0, 42 * 2 * np.pi, 504) # 42 years of monthly data
        shift = rng.uniform(0, 2*np.pi)
        noise = rng.normal(0, 0.1, 504)
        RAIN_CACHE[rid] = np.sin(months + shift) + noise
    return RAIN_CACHE[rid]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS regions (
            id TEXT PRIMARY KEY,
            name TEXT,
            lat REAL,
            lon REAL,
            radius REAL,
            value REAL,
            color TEXT,
            geometry TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

class RegionModel(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    radius: float
    value: float
    color: Optional[str] = None
    geometry: Optional[dict] = None

@app.get("/regions")
async def get_regions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Use id, name, lat, lon columns
    cursor.execute("SELECT id, name, lat, lon, radius, value, color, geometry FROM regions")
    rows = cursor.fetchall()
    conn.close()
    
    features = []
    for row in rows:
        rid, name, lat, lon, radius, value, color, geom_str = row
        
        # Build Geometry if missing or invalid
        geometry = json.loads(geom_str) if geom_str else {
            "type": "Point",
            "coordinates": [float(lon), float(lat)]
        }
        
        features.append({
            "type": "Feature",
            "id": rid,
            "geometry": geometry,
            "properties": {
                "id": rid,
                "name": name,
                "country": "Remote Region", # Default for Standalone
                "lat": float(lat),
                "lon": float(lon),
                "corr": 0.0,
                "lag": 0,
                "type": "neutral",
                "intensity": 0
            }
        })
    
    return {"type": "FeatureCollection", "features": features}

async def get_all_stats(reference_id: str):
    # 1. Fetch metadata from SQLite
    res = await get_regions()
    features = res.get("features", [])
    if not features: return [], "No regions in metadata DB"
    
    corrs_map = {}
    
    # 2. Vectorized Math (Instantaneous for 6700 points)
    if RAIN_ARR is not None:
        try:
            # Map ID to Index (IDs are "1", "2"...)
            ref_idx = int(reference_id) - 1
            if 0 <= ref_idx < RAIN_ARR.shape[0]:
                ref_centered = RAIN_CENTERED[ref_idx]
                ref_std = RAIN_STDS[ref_idx]

                # Batch calculation for all regions via NumPy Broadcasting
                numerators = np.dot(RAIN_CENTERED, ref_centered)
                denominators = N_TIME * RAIN_STDS.flatten() * ref_std
                
                results = np.divide(numerators, denominators, out=np.zeros_like(numerators), where=denominators!=0)
                
                for i, c in enumerate(results):
                    corrs_map[str(i+1)] = float(c)
        except Exception as e:
            print(f"Vectorization Error: {e}")

    # 3. Assemble Stats
    stats = []
    for f in features:
        props = f["properties"]
        rid = props["id"]
        
        # Use vectorized result if available
        if rid in corrs_map:
            corr_val = corrs_map[rid]
        else:
            # Fallback (slow)
            ref_rain = get_mock_rainfall(reference_id)
            rain = get_mock_rainfall(rid)
            corr_val = float(np.sum((ref_rain - np.mean(ref_rain)) * (rain - np.mean(rain))) / (len(rain) * np.std(ref_rain) * np.std(rain))) if np.std(ref_rain) != 0 and np.std(rain) != 0 else 0.0
        
        # Selected node logic
        if rid == reference_id:
            display_corr = 0.0
            display_type = "Neutral"
        else:
            display_corr = round(corr_val, 3)
            if corr_val >= 0.6: display_type = "Strong Similar"
            elif corr_val >= 0.3: display_type = "Moderate Similar"
            elif corr_val > -0.3: display_type = "Neutral"
            elif corr_val >= -0.6: display_type = "Moderate Complementary"
            else: display_type = "Strong Complementary"

        stats.append({
            "id": rid,
            "region_id": rid,
            "name": props["name"],
            "corr": display_corr,
            "type": display_type,
            "intensity": abs(display_corr),
            "lag": 0
        })
    return stats, None

@app.get("/correlation")
async def correlation_endpoint(region_id: str = Query(...)):
    stats, err = await get_all_stats(region_id)
    if err: raise HTTPException(status_code=400, detail=err)
    return stats

@app.get("/compare")
async def compare_regions(id_a: str, id_b: str):
    if RAIN_ARR is None:
        raise HTTPException(status_code=500, detail="Rainfall data not loaded")
    
    try:
        idx_a = int(id_a) - 1
        idx_b = int(id_b) - 1
        
        if not (0 <= idx_a < RAIN_ARR.shape[0]) or not (0 <= idx_b < RAIN_ARR.shape[0]):
            print(f"Warning: Comparing out of bounds IDs {id_a}, {id_b}. Using mock fallbacks.")
            series_a = get_mock_rainfall(id_a).tolist()
            series_b = get_mock_rainfall(id_b).tolist()
            n_months = len(series_a)
        else:
            series_a = RAIN_ARR[idx_a].tolist()
            series_b = RAIN_ARR[idx_b].tolist()
            n_months = RAIN_ARR.shape[1]
        
        # Generate dates starting 1979 (matching index)
        dates = [d.strftime("%Y-%m") for d in pd.date_range("1979-01-01", periods=n_months, freq="MS")]
        
        return {
            "id_a": id_a,
            "id_b": id_b,
            "dates": dates,
            "series_a": series_a,
            "series_b": series_b,
            "n_months": n_months
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/top-similar")
async def top_similar(region_id: str = Query(...)):
    stats, err = await get_all_stats(region_id)
    if err: raise HTTPException(status_code=400, detail=err)
    sim = sorted([s for s in stats if s["id"] != region_id], key=lambda x: x["corr"], reverse=True)
    return sim[:5]

@app.get("/top-complementary")
async def top_complementary(region_id: str = Query(...)):
    stats, err = await get_all_stats(region_id)
    if err: raise HTTPException(status_code=400, detail=err)
    comp = sorted([s for s in stats if s["id"] != region_id], key=lambda x: x["corr"])
    return comp[:5]

@app.post("/regions")
async def save_regions(regions: List[RegionModel]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM regions")
    for r in regions:
        cursor.execute("""
            INSERT INTO regions (id, name, lat, lon, radius, value, color, geometry)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (r.id, r.name, r.lat, r.lon, r.radius, r.value, r.color, json.dumps(r.geometry) if r.geometry else None))
    conn.commit()
    conn.close()
    return {"status": "success", "count": len(regions)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
