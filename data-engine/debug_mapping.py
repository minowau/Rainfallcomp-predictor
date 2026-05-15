import xarray as xr
import pandas as pd
import numpy as np

def debug_mapping():
    ds = xr.open_dataset('data/mock_chirps.nc')
    df = ds.to_dataframe().reset_index()
    
    # Simulate DB rows
    lats = ds.lat.values
    lons = ds.lon.values
    db_rows = []
    i = 1
    for lat in lats:
        for lon in lons:
            db_rows.append((i, float(lat), float(lon)))
            i += 1
            
    grid_id_map = {(round(float(r[1]), 4), round(float(r[2]), 4)): r[0] for r in db_rows}
    
    df['lat_r'] = df['lat'].round(4)
    df['lon_r'] = df['lon'].round(4)
    
    def get_rid(r):
        return grid_id_map.get((r['lat_r'], r['lon_r']))
        
    df['region_id'] = df.apply(get_rid, axis=1)
    
    print("DataFrame Header:")
    print(df[['lat', 'lon', 'lat_r', 'lon_r', 'region_id']].head())
    print("Missing IDs:", df['region_id'].isna().sum())
    print("Total records:", len(df))

if __name__ == "__main__":
    debug_mapping()
