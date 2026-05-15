import xarray as xr
import pandas as pd
import sqlite3
import os
import json

def ingest_standalone():
    nc_path = 'data/mock_chirps.nc'
    db_path = '../../map-app/server/regions.db'
    
    if not os.path.exists(nc_path):
        print(f"NetCDF not found at {nc_path}")
        return

    print(f"Loading grid from {nc_path}...")
    ds = xr.open_dataset(nc_path)
    
    # Extract land points (where precip is not NaN)
    # We take the first time slice common mean to identify land
    grid_df = ds.mean(dim='time').to_dataframe().reset_index()
    grid_df = grid_df.dropna(subset=['precip'])
    
    print(f"Found {len(grid_df)} land points. Connecting to SQLite at {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Re-create table to ensure fresh start
    cursor.execute("DROP TABLE IF EXISTS regions")
    cursor.execute("""
        CREATE TABLE regions (
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
    
    print("Ingesting points...")
    regions_batch = []
    for i, row in grid_df.iterrows():
        rid = str(i + 1)
        lat = float(row['lat'])
        lon = float(row['lon'])
        name = f"Point {rid} ({round(lat,1)}, {round(lon,1)})"
        
        # Geometry for MapLibre
        geometry = json.dumps({
            "type": "Point",
            "coordinates": [lon, lat]
        })
        
        regions_batch.append((
            rid,
            name,
            lat,
            lon,
            5.0, # Default radius
            0.0, # Initial value
            "#ffffff", # Default color
            geometry
        ))
        
        if len(regions_batch) >= 1000:
            cursor.executemany("INSERT INTO regions VALUES (?,?,?,?,?,?,?,?)", regions_batch)
            regions_batch = []
    
    if regions_batch:
        cursor.executemany("INSERT INTO regions VALUES (?,?,?,?,?,?,?,?)", regions_batch)
        
    conn.commit()
    conn.close()
    print(f"Successfully ingested {len(grid_df)} points into standalone regions.db")

if __name__ == "__main__":
    ingest_standalone()
