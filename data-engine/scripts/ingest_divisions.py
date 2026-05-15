import os
import sys
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Use SYNC URL for this batch job
SYNC_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/climate_data"

def create_mock_divisions():
    # Approximated centers/shapes for Tehsils in the screenshot area (Andhra Pradesh)
    # Kanigiri: 15.4, 79.5
    # Pamuru: 15.1, 79.4
    # Podili: 15.6, 79.6
    # Giddalur: 15.4, 78.9
    # Porumamilla: 15.0, 78.9
    # Jammalamadugu: 14.8, 78.4
    
    divisions = [
        {"name": "West Rajasthan", "lat": 25.0, "lon": 71.0, "country": "India"},
        {"name": "Gujarat", "lat": 22.0, "lon": 71.0, "country": "India"},
        {"name": "Madhya Pradesh", "lat": 23.0, "lon": 78.0, "country": "India"},
        {"name": "Darwin", "lat": -12.4, "lon": 130.8, "country": "Australia"},
        {"name": "Broome", "lat": -17.9, "lon": 122.2, "country": "Australia"},
        {"name": "Cairns", "lat": -16.9, "lon": 145.7, "country": "Australia"},
        {"name": "Sahel Region", "lat": 15.0, "lon": 15.0, "country": "Africa"},
        {"name": "Ethiopia Highs", "lat": 9.0, "lon": 38.0, "country": "Africa"},
        {"name": "Mozambique", "lat": -18.0, "lon": 35.0, "country": "Africa"},
        {"name": "Botswana", "lat": -22.0, "lon": 24.0, "country": "Africa"},
        {"name": "Thailand Central", "lat": 14.0, "lon": 100.0, "country": "Asia"},
        {"name": "Amazon Basin", "lat": -3.0, "lon": -60.0, "country": "South America"}
    ]

    engine = create_engine(SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("Clearing old divisions...")
    session.execute(text("TRUNCATE TABLE administrative_divisions CASCADE"))
    session.commit()

    print("Ingesting divisions as irregular polygons...")
    for div in divisions:
        lat = div.get("lat", 15.0)
        lon = div.get("lon", 79.0)
        
        # Create a larger "Irregular" polygon for visual realism and grid alignment
        # (Square-ish with some noise)
        w = 2.5 # Large enough to catch multiple 2.0-degree grid points


        coords = [
            [lon - w, lat - w], [lon + w + 0.02, lat - w - 0.01],
            [lon + w, lat + w + 0.03], [lon - w - 0.01, lat + w],
            [lon - w, lat - w]
        ]
        
        poly_wkt = f"POLYGON(({','.join([f'{c[0]} {c[1]}' for c in coords])}))"
        
        sql = """
            INSERT INTO administrative_divisions (name, country, geom)
            VALUES (:name, :country, ST_GeomFromText(:geom, 4326))
        """
        session.execute(text(sql), {"name": div["name"], "country": div.get("country", "Unknown"), "geom": poly_wkt})
    
    session.commit()
    print(f"Successfully ingested {len(divisions)} divisions.")
    session.close()

if __name__ == "__main__":
    create_mock_divisions()
