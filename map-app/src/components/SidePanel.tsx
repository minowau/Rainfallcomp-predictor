import React from 'react';
import { useStore } from '../store/useStore';

const SidePanel: React.FC = () => {
  const { topComplementary, topSimilar, regions, referenceRegionId, setReferenceRegion, hydrationStatus, comparisonMode, setComparisonMode } = useStore();
  
  const referenceRegion = regions.find(r => r.id === referenceRegionId);

  return (
    <div className="absolute top-8 left-8 w-80 max-h-[calc(100vh-64px)] bg-[#101625]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-y-auto flex flex-col pointer-events-auto z-20">
      {/* Header */}
      <div className="p-5 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Standard View</div>
          <button 
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${comparisonMode ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
          >
            <div className={`w-2 h-2 rounded-full ${comparisonMode ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Comparison</span>
          </button>
        </div>
        
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">
          {comparisonMode ? 'Comparison Base (A)' : 'Reference Region'}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-white truncate mr-2">{referenceRegion?.name || 'Select a region'}</div>
          {hydrationStatus === 'loading' && (
            <div className="w-4 h-4 rounded-full border-2 border-blue-500/50 border-t-blue-500 animate-spin flex-shrink-0" />
          )}
        </div>
        <div className="text-xs text-blue-400 mt-0.5">{referenceRegion?.country || 'Global Data Mesh'}</div>
        
        {comparisonMode && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-200 italic shadow-lg">
            "Click any other point on the map to compare it with the current base region."
          </div>
        )}
      </div>

      {/* Top Similar */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Top 5 Similar Regions</h3>
        </div>
        <div className="space-y-2">
          {topSimilar.slice(0, 5).map((r, i) => (
            <div 
              key={r.id} 
              onClick={() => setReferenceRegion(r.id.toString())}
              className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-gray-600">{i + 1}</span>
                <div>
                  <div className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{r.name}</div>
                  <div className="text-[10px] text-gray-500">{r.type}</div>
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-blue-400">+{r.corr.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Complementary */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Top 5 Complementary Regions</h3>
        </div>
        <div className="space-y-2">
          {topComplementary.slice(0, 5).map((r, i) => (
            <div 
              key={r.id} 
              onClick={() => setReferenceRegion(r.id.toString())}
              className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-gray-600">{i + 1}</span>
                <div>
                  <div className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{r.name}</div>
                  <div className="text-[10px] text-gray-500">{r.type}</div>
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-red-400">{r.corr.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Panel */}
      <div className="mt-auto p-5 bg-white/5 border-t border-white/10">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Complementarity Definition</h4>
        <p className="text-[11px] text-gray-500 leading-relaxed italic">
          Complementarity means that rainfall patterns between two regions occur at opposite times. 
          <br /><br />
          <span className="text-gray-400 font-medium">Example:</span> If <span className="text-blue-400">Region A</span> is wet in July while <span className="text-red-400">Region B</span> is wet in January, they are complementary (negative correlation).
        </p>
      </div>
    </div>
  );
};

export default SidePanel;
