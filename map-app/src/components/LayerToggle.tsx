import React from 'react';
import { useStore } from '../store/useStore';
import { Cloud, Wind, Hexagon } from 'lucide-react';

const LayerToggle: React.FC = () => {
    const { showClouds, setShowClouds, showCyclones, setShowCyclones } = useStore();

    return (
        <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-20">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 ml-1 text-shadow">Atmosphere Layers</h4>
            <div className="flex gap-2 p-2 bg-[#121826]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
                <button
                    onClick={() => setShowClouds(!showClouds)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        showClouds 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'text-gray-400 hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <Cloud size={16} />
                    <span className="text-xs font-bold">Live Clouds</span>
                </button>

                <button
                    onClick={() => setShowCyclones(!showCyclones)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        showCyclones 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'text-gray-400 hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <Wind size={16} />
                    <span className="text-xs font-bold">Active Cyclones</span>
                </button>

                <div className="w-px h-8 bg-white/10 mx-1 self-center" />

                <div className="flex items-center gap-2 px-4 py-2 text-blue-400">
                    <Hexagon size={16} />
                    <span className="text-xs font-bold">Rainfall Feed</span>
                </div>
            </div>
        </div>
    );
};

export default LayerToggle;
