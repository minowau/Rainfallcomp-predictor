import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Upload, Plus, Layers, Sliders, X, Check, RefreshCcw, WifiOff, Wind, Trash2, Globe } from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';

const Controls: React.FC = () => {
  const { 
    addRegion, 
    setRegions, 
    toggleHeatmap, 
    toggleCircles, 
    toggleWinds,
    showHeatmap, 
    showCircles,
    showWinds,
    opacity,
    setOpacity,
    radiusScale,
    setRadiusScale,
    hydrationStatus,
    seedMonsoonData
  } = useStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newRegion, setNewRegion] = useState({ name: '', lat: 0, lon: 0, radius: 100, value: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setRegions(json.map((r: any) => ({ ...r, id: Math.random().toString(36).substr(2, 9) })));
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          setRegions(results.data.map((r: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: r.name || 'Unnamed',
            lat: r.lat || 0,
            lon: r.lon || 0,
            radius: r.radius || 100,
            value: r.value || 0
          })));
        }
      });
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10 w-80 space-y-4">
      {/* Main Control Panel */}
      <div className="glass rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sliders size={20} className="text-blue-400" /> Map Controls
          </h2>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              hydrationStatus === 'success' ? 'bg-green-500/20 text-green-400' :
              hydrationStatus === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-blue-500/20 text-blue-400 animate-pulse'
            }`}>
              {hydrationStatus === 'success' && <Check size={10} />}
              {hydrationStatus === 'loading' && <RefreshCcw size={10} className="animate-spin" />}
              {hydrationStatus === 'error' && <WifiOff size={10} />}
              {hydrationStatus === 'idle' ? 'Ready' : hydrationStatus}
            </div>
            <label className="cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <Upload size={18} />
              <input type="file" className="hidden" accept=".json,.csv" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {/* Layer Toggles */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={toggleCircles}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${showCircles ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
            >
              <Layers size={14} /> Circles
            </button>
            <button 
              onClick={toggleHeatmap}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${showHeatmap ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
            >
              <Layers size={14} /> Heat
            </button>
            <button 
              onClick={toggleWinds}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${showWinds ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
            >
              <Wind size={14} /> Winds
            </button>
          </div>

          {/* Range Sliders */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wider">
                <span>Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.1" value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wider">
                <span>Radius Scale</span>
                <span>{radiusScale}x</span>
              </div>
              <input 
                type="range" min="0.1" max="5" step="0.1" value={radiusScale} 
                onChange={(e) => setRadiusScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 px-1">Scientific Dataset</div>
            <div className="flex gap-2">
              <button 
                onClick={seedMonsoonData}
                className="flex-1 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all group"
              >
                <Globe size={14} className="group-hover:rotate-12 transition-transform" /> Project Monsoon Core
              </button>
              <button 
                onClick={() => setRegions([])}
                className="w-12 h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center transition-all"
                title="Clear All Regions"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={16} /> Add Region Manually
          </button>
        </div>
      </div>

      {/* Manual Input Form Overlay */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-4 shadow-2xl border-blue-500/30"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400">New Region</h3>
              <button onClick={() => setIsAdding(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input 
                type="text" placeholder="Region Name" 
                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                value={newRegion.name} onChange={e => setNewRegion({...newRegion, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" placeholder="Lat" 
                  className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                  value={newRegion.lat} onChange={e => setNewRegion({...newRegion, lat: parseFloat(e.target.value)})}
                />
                <input 
                  type="number" placeholder="Lon" 
                  className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                  value={newRegion.lon} onChange={e => setNewRegion({...newRegion, lon: parseFloat(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" placeholder="Radius (km)" 
                  className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                  value={newRegion.radius} onChange={e => setNewRegion({...newRegion, radius: parseFloat(e.target.value)})}
                />
                <input 
                  type="number" placeholder="Value (-1 to 1)" step="0.1"
                  className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                  value={newRegion.value} onChange={e => setNewRegion({...newRegion, value: parseFloat(e.target.value)})}
                />
              </div>
              <button 
                onClick={() => {
                  addRegion({ ...newRegion, id: Math.random().toString(36).substr(2, 9) });
                  setIsAdding(false);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all mt-2"
              >
                Create Region
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Controls;
