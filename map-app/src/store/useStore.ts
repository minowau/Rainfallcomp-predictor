import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import monsoonData from '../data/monsoonData';

export interface Region {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lon: number;
  corr: number;
  lag: number;
  type: string;
  intensity: number;
  geometry: any;
}

export type HydrationStatus = 'idle' | 'loading' | 'success' | 'error';

interface ComparisonData {
  id_a: string;
  id_b: string;
  dates: string[];
  series_a: number[];
  series_b: number[];
}

interface MapState {
  regions: Region[];
  topComplementary: Region[];
  topSimilar: Region[];
  referenceRegionId: string | null;
  referenceRegionIdB: string | null; // For comparison
  comparisonMode: boolean;
  comparisonData: ComparisonData | null;
  hydrationStatus: HydrationStatus;
  showClouds: boolean;
  showCyclones: boolean;
  
  fetchInitialData: () => Promise<void>;
  setReferenceRegion: (id: string) => Promise<void>;
  setComparisonMode: (active: boolean) => void;
  setShowClouds: (show: boolean) => void;
  setShowCyclones: (show: boolean) => void;
}

export const useStore = create<MapState>()(
  persist(
    (set, get) => ({
      regions: [],
      topComplementary: [],
      topSimilar: [],
      referenceRegionId: null,
      referenceRegionIdB: null,
      comparisonMode: false,
      comparisonData: null,
      hydrationStatus: 'idle',
      showClouds: false,
      showCyclones: false,

      setShowClouds: (show: boolean) => set({ showClouds: show }),
      setShowCyclones: (show: boolean) => set({ showCyclones: show }),
      setComparisonMode: (active: boolean) => set({ 
        comparisonMode: active, 
        referenceRegionIdB: active ? null : null,
        comparisonData: active ? null : null 
      }),

      fetchInitialData: async () => {
        // Save persisted state values because standard setReferenceRegion will clear them!
        const savedRefA = get().referenceRegionId;
        const savedRefB = get().referenceRegionIdB;
        const savedCompMode = get().comparisonMode;

        set({ hydrationStatus: 'loading' });
        try {
          console.log('[STORE] Fetching 6,700 regions from 127.0.0.1...');
          const res = await fetch('http://127.0.0.1:8000/regions');
          if (!res.ok) throw new Error('Failed to fetch regions');
          const geojson = await res.json();
          console.log(`[STORE] Received ${geojson.features?.length} points`);
          
          const initialRegions = geojson.features.map((f: any) => ({
            id: f.properties.id.toString(),
            name: f.properties.name,
            country: f.properties.country,
            geometry: f.geometry,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            corr: 0,
            lag: 0,
            type: 'neutral',
            intensity: 0
          }));

          set({ regions: initialRegions, hydrationStatus: 'success' });
          
          const defaultPoint = initialRegions.find((r: any) => 
            r.lat > 20 && r.lat < 30 && r.lon > 65 && r.lon < 75
          ) || initialRegions[Math.floor(initialRegions.length / 2)];

          if (savedRefA) {
            console.log(`[STORE] Rehydrating persisted Region A: ${savedRefA}`);
            await get().setReferenceRegion(savedRefA);
            
            if (savedCompMode && savedRefB) {
              console.log(`[STORE] Rehydrating persisted Region B: ${savedRefB}`);
              set({ comparisonMode: true });
              await get().setReferenceRegion(savedRefB);
            }
          } else if (defaultPoint) {
            console.log(`[STORE] Auto-selecting seed point: ${defaultPoint.id}`);
            get().setReferenceRegion(defaultPoint.id);
          }

        } catch (err) {
          console.error('[STORE] Hydration failed:', err);
          set({ hydrationStatus: 'error' });
        }
      },

      setReferenceRegion: async (id: string) => {
        const { comparisonMode, referenceRegionId } = get();
        
        // BRANCH: Comparison Selection (Setting Region B)
        // Only happens if comparisonMode is ON and we ALREADY have a Region A
        if (comparisonMode && referenceRegionId && id !== referenceRegionId) {
          console.log(`[STORE] Setting Comparison Target B: ${id}`);
          set({ referenceRegionIdB: id, hydrationStatus: 'loading' });
          
          try {
            const res = await fetch(`http://127.0.0.1:8000/compare?id_a=${referenceRegionId}&id_b=${id}`);
            if (res.ok) {
              const data = await res.json();
              console.log('[STORE] Comparison data received and synchronized');
              set({ comparisonData: data, hydrationStatus: 'success' });
            } else {
              console.error('[STORE] Comparison endpoint failed');
              set({ hydrationStatus: 'error' });
            }
          } catch (err) {
            console.error("[STORE] Failed to fetch comparison data:", err);
            set({ hydrationStatus: 'error' });
          }
          return;
        }

        // BRANCH: Standard Selection (Setting Region A)
        // Happens if comparisonMode is OFF OR if we don't have a Region A yet
        console.log(`[STORE] Establishing Reference Region A: ${id}`);
        set({ 
            referenceRegionId: id, 
            referenceRegionIdB: null, 
            comparisonData: null, 
            hydrationStatus: 'loading' 
        });
        
        try {
          const numericId = parseInt(id);
          console.log(`[STORE] Updating correlations for point ${numericId}...`);
          const [corrRes, compRes, simRes] = await Promise.all([
            fetch(`http://127.0.0.1:8000/correlation?region_id=${numericId}`),
            fetch(`http://127.0.0.1:8000/top-complementary?region_id=${numericId}`),
            fetch(`http://127.0.0.1:8000/top-similar?region_id=${numericId}`)
          ]);

          if (corrRes.ok && compRes.ok && simRes.ok) {
            const corrs = await corrRes.json();
            const topComp = await compRes.json();
            const topSim = await simRes.json();
            console.log(`[STORE] Received stats. Similar: ${topSim.length}, Complementary: ${topComp.length}`);

            if (Array.isArray(corrs) && Array.isArray(topComp) && Array.isArray(topSim)) {
              const corrMap = new Map(corrs.map((c: any) => [c.id.toString(), c]));
              
              set((state) => {
                const updatedRegions = state.regions.map(r => {
                  const c = corrMap.get(r.id);
                  if (r.id === id) {
                    return { ...r, corr: 0.0, type: 'neutral', intensity: 0 };
                  }
                  return c ? { ...r, ...c, id: r.id } : r;
                });

                return {
                  topComplementary: topComp,
                  topSimilar: topSim,
                  regions: updatedRegions,
                  hydrationStatus: 'success'
                };
              });
            }
          } else {
            throw new Error('Correlation endpoints returned errors');
          }
        } catch (err) {
          console.error('Failed to update correlations:', err);
          set({ hydrationStatus: 'error' });
        }
      }
    }),
    {
      name: 'map-storage',
      partialize: (state) => ({ 
        referenceRegionId: state.referenceRegionId,
        referenceRegionIdB: state.referenceRegionIdB,
        comparisonMode: state.comparisonMode,
        showClouds: state.showClouds,
        showCyclones: state.showCyclones
      })
    }
  )
);

