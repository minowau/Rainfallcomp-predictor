import React, { useEffect } from 'react';
import Map from './components/Map';
import { useStore } from './store/useStore';
import SidePanel from './components/SidePanel';
import LayerToggle from './components/LayerToggle';
import ComparisonPanel from './components/ComparisonPanel';

function App() {
  const { fetchInitialData } = useStore();

  useEffect(() => {
    fetchInitialData();
  }, []);

  return (
    <div className="w-screen h-screen relative bg-[#0b0f1a] overflow-hidden selection:bg-blue-500/30 font-sans">
      {/* Map is fullscreen background */}
      <Map />

      {/* Floating UI Layer */}
      <SidePanel />
      <LayerToggle />
      <ComparisonPanel />

      {/* Subtle background glow effects */}
      <div className="pointer-events-none fixed top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#007aff]/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ff3b3b]/5 blur-[150px] rounded-full" />
      </div>

    </div>
  );
}

export default App;
