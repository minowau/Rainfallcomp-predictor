import xarray as xr
import pandas as pd
import os
import sys
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Use SYNC URL for this batch job
SYNC_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/climate_data"

def ingest():
    nc_path = 'data/mock_chirps.nc'
    if not os.path.exists(nc_path):
        print(f"File not found: {nc_path}")
        return
        
    print(f"Loading netCDF {nc_path}...")
    ds = xr.open_dataset(nc_path)
    
    engine = create_engine(SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("Initializing Database Extensions...")
    session.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
    session.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb;"))
    session.commit()

    from app.db.models import Base, GridPoint, RainfallSeries
    
    print("Creating tables...")
    Base.metadata.create_all(engine)
    session.commit()

    try:
        session.execute(text("SELECT create_hypertable('rainfall_series', 'time', if_not_exists => TRUE);"))
        session.commit()
    except Exception as e:
        pass

    print("Clearing data...")
    session.execute(text("TRUNCATE TABLE correlation_results CASCADE"))
    session.execute(text("TRUNCATE TABLE rainfall_series CASCADE"))
    session.execute(text("TRUNCATE TABLE grid_points CASCADE"))
    session.commit()

    print("Inserting Grid Points...")
    # Convert to dataframe and drop NaNs (Oceans)
    grid_df = ds.mean(dim='time').to_dataframe().reset_index()
    grid_df = grid_df.dropna(subset=['precip'])
    
    # Insert Land-only Grid Points
    grid_points_to_insert = grid_df[['lat', 'lon']]
    grid_points_to_insert.to_sql('grid_points', engine, if_exists='append', index=False, chunksize=10000)
    
    print("Populating PostGIS Geometry column...")
    session.execute(text("UPDATE grid_points SET geom = ST_SetSRID(ST_Point(lon, lat), 4326) WHERE geom IS NULL"))
    session.commit()

    print("Fetching Grid ID mappings...")
    res = session.execute(text("SELECT id, lat, lon FROM grid_points"))
    rows = res.all()
    grid_id_map = {(round(float(row[1]), 4), round(float(row[2]), 4)): row[0] for row in rows}

    print("Processing Time Series (Land Only)...")
    df = ds.to_dataframe().reset_index()
    df = df.dropna(subset=['precip']) # Skip Oceans
    
    df['lat_r'] = df['lat'].astype(float).round(4)
    df['lon_r'] = df['lon'].astype(float).round(4)
    
    # Map back to Database IDs
    mapping_data = []
    for (lat, lon), rid in grid_id_map.items():
        mapping_data.append({'lat_r': lat, 'lon_r': lon, 'region_id': rid})
    
    map_df = pd.DataFrame(mapping_data)
    df = pd.merge(df, map_df, on=['lat_r', 'lon_r'], how='inner')

    records = df[['time', 'region_id', 'precip']].rename(columns={'precip': 'rainfall'})
    records['region_id'] = records['region_id'].astype(int)

    print(f"Inserting {len(records)} records via pandas to_sql...")
    records.to_sql('rainfall_series', engine, if_exists='append', index=False, chunksize=10000)
    
    print(f"Ingestion complete. Total points: {len(grid_id_map)}")
    session.close()

if __name__ == "__main__":
    ingest()
