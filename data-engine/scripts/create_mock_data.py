import numpy as np
import xarray as xr
import pandas as pd
import os
from global_land_mask import globe

def create_mock_netcdf(filename="data/mock_chirps.nc"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # Load historical drivers
    drivers_path = "data/historical_indices.csv"
    if not os.path.exists(drivers_path):
        print("Error: historical_indices.csv not found.")
        return
        
    drivers = pd.read_csv(drivers_path)
    oni = drivers['oni'].values
    dmi = drivers['dmi'].values
    n_months = len(drivers) # 504
    times = pd.to_datetime(drivers['time'])
    
    # Resolution for ~6700 land points
    res = 1.8
    lats = np.arange(-90, 90, res)
    lons = np.arange(-180, 180, res)
    
    land_coords = []
    for lat in lats:
        for lon in lons:
            if globe.is_land(lat, lon):
                land_coords.append((lat, lon))
    
    print(f"Generating 1979-2020 Historical Proxy Data for {len(land_coords)} land points...")
    
    data = np.zeros((n_months, len(land_coords)))
    
    for i, (lat, lon) in enumerate(land_coords):
        # 1. Base Seasonal Signal
        months_arr = np.arange(n_months)
        phase_shift = 9 if lat >= 0 else 3
        seasonal = 35 * np.sin(2 * np.pi * (months_arr + phase_shift) / 12)
        
        # 2. Historical Climate Forcing (Teleconnections)
        # Indian Monsoon (Opposes El Nino, Loves Positive IOD)
        is_india = (lat > 8 and lat < 30 and lon > 68 and lon < 90)
        # Amazon (Opposes El Nino)
        is_amazon = (lat > -15 and lat < 5 and lon > -75 and lon < -50)
        # East Africa (Loves Positive IOD)
        is_eafrica = (lat > -10 and lat < 15 and lon > 30 and lon < 50)
        # Australia (Opposes El Nino)
        is_au = (lat < -15 and lat > -40 and lon > 115 and lon < 155)
        
        forcing = np.zeros(n_months)
        if is_india:
            forcing = -20 * oni + 15 * dmi
        elif is_amazon:
            forcing = -30 * oni
        elif is_eafrica:
            forcing = 25 * dmi
        elif is_au:
            forcing = -15 * oni
        else:
            # Ambient global teleconnection noise
            forcing = 5 * np.sin(lat/15) * oni + 5 * np.cos(lon/20) * dmi
            
        # 3. Add Noise & Base Rainfall
        noise = np.random.normal(0, 12, n_months)
        # Add a random shift for each point's micro-climatology
        local_base = np.random.uniform(50, 150)
        
        val_series = local_base + seasonal + forcing + noise
        data[:, i] = np.maximum(5, val_series)
            
    # Reshape and Save
    full_grid = np.full((n_months, len(lats), len(lons)), np.nan)
    for i, (lat, lon) in enumerate(land_coords):
        lat_idx = np.argmin(np.abs(lats - lat))
        lon_idx = np.argmin(np.abs(lons - lon))
        full_grid[:, lat_idx, lon_idx] = data[:, i]
        
    ds = xr.Dataset(
        {"precip": (("time", "lat", "lon"), full_grid)},
        coords={"time": times, "lat": lats, "lon": lons},
        attrs={"description": "Historical Proxy Global Rainfall 1979-2020 (ENSODriven)"}
    )
    ds.to_netcdf(filename, mode='w')
    print(f"Created historical dataset (504 months) at {filename}.")

if __name__ == "__main__":
    create_mock_netcdf()
