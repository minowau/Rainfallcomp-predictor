import numpy as np
import pandas as pd

def generate_drivers():
    years = np.arange(1979, 2021)
    months = np.arange(1, 13)
    times = pd.date_range("1979-01-01", "2020-12-01", freq="MS")
    n = len(times)
    
    # 1. ENSO (ONI) - Simplified Historical peaks
    oni = np.zeros(n)
    
    def add_event(year, duration_months, peak_val):
        start_idx = (year - 1979) * 12 + 6 # El Ninos often peak in winter
        for i in range(duration_months):
            if start_idx + i < n:
                # Sine bell curve for the event
                oni[start_idx + i] += peak_val * np.sin(np.pi * i / duration_months)

    # Historical Anchors
    add_event(1982, 12, 2.2) # Super El Nino
    add_event(1987, 10, 1.2)
    add_event(1991, 12, 1.5)
    add_event(1997, 14, 2.5) # Super El Nino
    add_event(2002, 10, 1.0)
    add_event(2009, 12, 1.3)
    add_event(2015, 15, 2.6) # Super El Nino
    
    # La Ninas (Negative)
    add_event(1988, 12, -1.8)
    add_event(1998, 24, -1.5)
    add_event(2010, 18, -1.6)
    add_event(2020, 12, -1.2)
    
    # Add ambient noise
    oni += np.random.normal(0, 0.2, n)

    # 2. IOD (DMI) - Simplified Historical peaks
    dmi = np.zeros(n)
    add_event_dmi = lambda y, d, p: add_event(y, d, p) # reuse logic
    
    add_event(1994, 6, 1.0)
    add_event(1997, 8, 1.2)
    add_event(2006, 6, 0.8)
    add_event(2019, 8, 1.5) # Strong positive IOD
    
    # Save as CSV for ingestion
    df = pd.DataFrame({"time": times, "oni": oni, "dmi": dmi})
    df.to_csv("data/historical_indices.csv", index=False)
    print("Generated historical_indices.csv (1979-2020)")

if __name__ == "__main__":
    generate_drivers()
