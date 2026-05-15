import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore } from '../store/useStore';

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { regions, referenceRegionId, referenceRegionIdB, setReferenceRegion, showClouds, showCyclones, comparisonMode } = useStore();
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Get yesterday's date for NASA GIBS (ensures data is available)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [40, 20],
      zoom: 2,
      attributionControl: false,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // NASA Clouds Source (MODIS Terra)
      map.current.addSource('nasa-clouds', {
        type: 'raster',
        tiles: [
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
        ],
        tileSize: 256
      });

      map.current.addLayer({
        id: 'nasa-clouds',
        type: 'raster',
        source: 'nasa-clouds',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.5 }
      }, 'regions-glow'); // Place below rainfall glow

      // GDACS Cyclones Source
      map.current.addSource('gdacs-cyclones', {
        type: 'geojson',
        data: 'https://www.gdacs.org/gdacsapi/api/polygons/getall?eventtype=TC'
      });

      map.current.addLayer({
        id: 'cyclone-fill',
        type: 'fill',
        source: 'gdacs-cyclones',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': '#ff3b3b',
          'fill-opacity': 0.3,
          'fill-outline-color': '#ffffff'
        }
      });

      map.current.addSource('regions', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'regions-glow',
        type: 'circle',
        source: 'regions',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, ['*', 12, ['abs', ['get', 'corr']]],
            10, ['*', 30, ['abs', ['get', 'corr']]]
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'corr'],
            -1.0, '#ff0000', // Strong Red (Now Complementary)
            -0.6, '#ff4d4d', 
            -0.3, 'rgba(255, 204, 204, 0)', 
            0.0, 'rgba(0,0,0,0)',
            0.3, 'rgba(204, 224, 255, 0)',
            0.6, '#3377ff', 
            1.0, '#001a66'   // Deep Navy (Now Similar)
          ],
          'circle-blur': 1.8,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['abs', ['get', 'corr']],
            0.3, 0.0,
            0.6, 0.4,
            1.0, 0.7
          ]
        }
      });

      map.current.addLayer({
        id: 'regions-fill',
        type: 'circle',
        source: 'regions',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            5, 4,
            10, 8
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'corr'],
            -1.0, '#ff0000', // Strong Red (Complementary)
            -0.6, '#ff4d4d', 
            -0.3, '#ffcccc', 
            0.0, '#ffffff',  
            0.3, '#cce0ff', 
            0.6, '#3377ff',  
            1.0, '#001a66'   // Deep Navy (Similar)
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'id'], Number(referenceRegionId) || -1], 3,
            0.5
          ],
          'circle-stroke-color': '#ffffff',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['abs', ['get', 'corr']],
            0, 0.1,
            0.3, 0.3,
            0.6, 0.8,
            1, 1.0
          ]
        }
      });

      setIsLoaded(true);

      // Hover effect
      map.current.on('mousemove', 'regions-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          setHoverInfo({
            x: e.point.x,
            y: e.point.y,
            props: feature.properties
          });
          map.current!.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'regions-fill', () => {
        setHoverInfo(null);
        map.current!.getCanvas().style.cursor = '';
      });

      // Click to select reference
      map.current.on('click', 'regions-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const id = e.features[0].properties.id;
          setReferenceRegion(id.toString());
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Toggle Weather Layers
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    if (map.current.getLayer('nasa-clouds')) {
      map.current.setLayoutProperty('nasa-clouds', 'visibility', showClouds ? 'visible' : 'none');
    }
    
    if (map.current.getLayer('cyclone-fill')) {
      map.current.setLayoutProperty('cyclone-fill', 'visibility', showCyclones ? 'visible' : 'none');
    }
  }, [showClouds, showCyclones, isLoaded]);

  // Handle Data Updates & Visual Highlights
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const source = map.current.getSource('regions') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: regions.map(r => ({
          type: 'Feature',
          geometry: r.geometry,
          properties: { ...r }
        }))
      });
    }

    if (map.current.getLayer('regions-fill')) {
        const isSelectedA = ['==', ['get', 'id'], referenceRegionId ? referenceRegionId.toString() : "-1"];
        const isSelectedB = ['==', ['get', 'id'], referenceRegionIdB ? referenceRegionIdB.toString() : "-1"];
        
        map.current.setPaintProperty('regions-fill', 'circle-stroke-width', [
            'case',
            isSelectedA, 4,
            isSelectedB, 4,
            0.5
        ]);

        map.current.setPaintProperty('regions-fill', 'circle-stroke-color', [
            'case',
            isSelectedA, '#3b82f6', // Blue for A
            isSelectedB, '#ef4444', // Red for B
            '#ffffff'
        ]);
        
        map.current.setPaintProperty('regions-fill', 'circle-radius', [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, ['case', ['any', isSelectedA, isSelectedB], 8, 2],
            10, ['case', ['any', isSelectedA, isSelectedB], 20, 8]
        ]);

        // Fly navigation logic
        const targetId = referenceRegionIdB || referenceRegionId;
        const targetRegion = regions.find(r => r.id === targetId);
        if (targetRegion) {
          map.current.flyTo({
            center: [targetRegion.lon, targetRegion.lat],
            zoom: 4,
            essential: true,
            duration: 1200
          });
        }
    }
  }, [regions, referenceRegionId, referenceRegionIdB, isLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {hoverInfo && (
        <div 
          className="absolute z-50 bg-[#121826]/90 backdrop-blur-md rounded-lg p-3 text-xs text-white border border-white/10 shadow-2xl pointer-events-none"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y - 20 }}
        >
          <div className="font-bold text-sm mb-1 text-white">{hoverInfo.props.name}</div>
          <div className="text-gray-400 mb-2">{hoverInfo.props.country}</div>
          
          <div className="space-y-1">
            <div className="flex justify-between gap-8">
              <span>Correlation:</span>
              <span className={hoverInfo.props.corr > 0.3 ? 'text-blue-400' : (hoverInfo.props.corr < -0.3 ? 'text-red-400' : 'text-white')}>
                {hoverInfo.props.corr > 0 ? '+' : ''}{hoverInfo.props.corr.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Lag:</span>
              <span>{hoverInfo.props.lag} months</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Type:</span>
              <span className="capitalize">{hoverInfo.props.type}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-400 italic max-w-[200px]">
             {hoverInfo.props.corr < -0.3 
               ? <span className="text-red-400">Rainfall occurs here when the selected region is dry.</span>
               : hoverInfo.props.corr > 0.3 
               ? <span className="text-blue-400">Rainfall follows the selected region closely.</span>
               : "No strong temporal synchronization."}
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
