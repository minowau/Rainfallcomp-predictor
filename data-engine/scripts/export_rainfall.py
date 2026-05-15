import xarray as xr
import numpy as np
import os

def export_rainfall():
    nc_path = 'data/mock_chirps.nc'
    out_path = r'E:\maindocuments\fullstackfull\map-app\server\rainfall.npy'
    
    print(f"Loading {nc_path}...")
    ds = xr.open_dataset(nc_path)
    
    # Get land mask indices
    grid_df = ds.mean(dim='time').to_dataframe().reset_index().dropna(subset=['precip'])
    
    print("Extracting time series...")
    data = ds.precip.values # (time, lat, lon)
    lats = ds.lat.values
    lons = ds.lon.values
    
    land_data = []
    for i, row in grid_df.iterrows():
        lat_idx = np.argmin(np.abs(lats - row['lat']))
        lon_idx = np.argmin(np.abs(lons - row['lon']))
        series = data[:, lat_idx, lon_idx]
        land_data.append(series)
        
        if (i+1) % 1000 == 0:
            print(f"Processed {i+1} regions...")

    final_arr = np.array(land_data)
    print(f"Saving array of shape {final_arr.shape} to {out_path}...")
    np.save(out_path, final_arr)
    print("Done!")

if __name__ == "__main__":
    export_rainfall()
