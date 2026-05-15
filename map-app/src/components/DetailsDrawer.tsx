import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, AlertTriangle, TrendingUp, Trash2, Palette } from 'lucide-react';
import { useStore } from '@/store/useStore';

const DetailsDrawer: React.FC = () => {
  const { regions, selectedRegionId, setSelectedRegionId, updateRegion, removeRegion } = useStore();
  
  const region = regions.find((r) => r.id === selectedRegionId);

  if (!selectedRegionId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 w-96 h-full bg-panel backdrop-blur-xl border-l border-white/10 z-50 p-6 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <input
            type="text"
            value={region?.name || ''}
            onChange={(e) => region && updateRegion(region.id, { name: e.target.value })}
            className="text-2xl font-bold bg-transparent border-none focus:ring-0 text-white w-full"
          />
          <button
            onClick={() => setSelectedRegionId(null)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!region ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40 space-y-4">
            <AlertTriangle size={48} />
            <p>Region not found</p>
          </div>
        ) : (
          <div className="flex-1 space-y-8 overflow-y-auto">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Correlation</p>
                <input
                  type="number"
                  step="0.1"
                  min="-1"
                  max="1"
                  value={region.value}
                  onChange={(e) => updateRegion(region.id, { value: parseFloat(e.target.value) })}
                  className="text-xl font-bold bg-transparent border-none focus:ring-0 text-white w-full"
                />
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Radius (km)</p>
                <input
                  type="number"
                  value={region.radius}
                  onChange={(e) => updateRegion(region.id, { radius: parseFloat(e.target.value) })}
                  className="text-xl font-bold bg-transparent border-none focus:ring-0 text-white w-full"
                />
              </div>
            </div>

            {/* Color Sync */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white group flex items-center gap-2">
                <Palette size={16} /> Color Customization
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={region.color || '#3b82f6'}
                  onChange={(e) => updateRegion(region.id, { color: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
                />
                <p className="text-white/60 text-sm">{region.color || 'Default (Auto)'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-8 border-t border-white/10">
              <button
                onClick={() => removeRegion(region.id)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all font-semibold"
              >
                <Trash2 size={20} />
                Delete Region
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DetailsDrawer;
