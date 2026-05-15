import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { X, Maximize2, Minimize2, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ComparisonPanel: React.FC = () => {
  const { comparisonData, comparisonMode, setComparisonMode, regions, referenceRegionId, referenceRegionIdB, hydrationStatus } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('annual');
  const [elNinoOnly, setElNinoOnly] = useState(false);

  if (!comparisonMode) return null;

  const regionA = regions.find(r => r.id === referenceRegionId);
  const regionB = regions.find(r => r.id === referenceRegionIdB);

  // Process data for Recharts
  const processData = () => {
    if (!comparisonData || !comparisonData.series_a || !comparisonData.series_b) return [];
    
    const { dates, series_a, series_b } = comparisonData;
    const dataPoints = Math.min(dates.length, series_a.length, series_b.length);
    
    const rawData = [];
    for (let i = 0; i < dataPoints; i++) {
        rawData.push({
            date: dates[i],
            year: dates[i].split('-')[0],
            month: dates[i].split('-')[1],
            valA: series_a[i] || 0,
            valB: series_b[i] || 0,
        });
    }

    const elNinoYears = ['1982', '1983', '1997', '1998', '2015', '2016'];
    const filteredData = elNinoOnly 
      ? rawData.filter(d => elNinoYears.includes(d.year))
      : rawData;

    if (viewMode === 'annual') {
      const annualMap = new Map<string, { year: string, valA: number, valB: number, count: number }>();
      
      filteredData.forEach(d => {
        const entry = annualMap.get(d.year) || { year: d.year, valA: 0, valB: 0, count: 0 };
        entry.valA += d.valA;
        entry.valB += d.valB;
        entry.count += 1;
        annualMap.set(d.year, entry);
      });

      return Array.from(annualMap.values()).map(d => ({
        name: d.year,
        valA: Math.round(d.valA / d.count),
        valB: Math.round(d.valB / d.count),
      }));
    }

    // Monthly view
    return filteredData.map(d => ({
        name: d.date,
        valA: Math.round(d.valA),
        valB: Math.round(d.valB),
    }));
  };

  const chartData = processData();

  const calculateCorrelation = (a: number[], b: number[]) => {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    const n = a.length;
    const muA = a.reduce((s, v) => s + v, 0) / n;
    const muB = b.reduce((s, v) => s + v, 0) / n;
    const stdA = Math.sqrt(a.reduce((s, v) => s + Math.pow(v - muA, 2), 0) / n);
    const stdB = Math.sqrt(b.reduce((s, v) => s + Math.pow(v - muB, 2), 0) / n);
    if (stdA === 0 || stdB === 0) return 0;
    const cov = a.reduce((s, v, i) => s + (v - muA) * (b[i] - muB), 0) / n;
    return cov / (stdA * stdB);
  };

  const historicalCorr = (comparisonData?.series_a && comparisonData?.series_b) 
    ? calculateCorrelation(comparisonData.series_a, comparisonData.series_b) 
    : 0;
    
  const recentCorr = (comparisonData?.series_a && comparisonData?.series_b) 
    ? calculateCorrelation(comparisonData.series_a.slice(-60), comparisonData.series_b.slice(-60)) 
    : 0;

  return (
    <motion.div 
      initial={{ x: 400 }} 
      animate={{ x: 0 }} 
      exit={{ x: 400 }}
      className={`fixed top-4 right-4 z-50 bg-[#0c1220]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-500 overflow-hidden ${isExpanded ? 'w-[850px] h-[700px]' : 'w-[400px] h-[650px]'}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Comparison Dashboard</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Analysis Mode: {viewMode} Rainfall (1979 - 2020)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setElNinoOnly(!elNinoOnly)}
            className={`text-[10px] px-3 py-1.5 rounded-lg border transition-colors font-bold uppercase tracking-wider ${elNinoOnly ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            {elNinoOnly ? 'Super El Niño: ON' : 'Super El Niño: OFF'}
          </button>
          <button 
            onClick={() => setViewMode(v => v === 'annual' ? 'monthly' : 'annual')}
            className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg border border-white/10 transition-colors font-bold uppercase tracking-wider"
          >
            {viewMode === 'annual' ? 'View Monthly' : 'View Annual'}
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white p-2">
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => setComparisonMode(false)} className="text-gray-500 hover:text-red-400 p-2">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-80px)] flex flex-col gap-4 overflow-y-auto">
        
        {/* Selection Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-xl border transition-all ${referenceRegionId ? 'bg-blue-500/5 border-blue-500/20' : 'bg-black/20 border-white/5'}`}>
            <span className="text-[9px] text-blue-400 font-bold block mb-1 uppercase tracking-widest">Region A (Base)</span>
            <span className="text-white text-sm font-bold truncate block">
                {regionA ? regionA.name : "Select on map..."}
            </span>
          </div>
          <div className={`p-4 rounded-xl border transition-all ${referenceRegionIdB ? 'bg-red-500/5 border-red-500/20' : 'bg-black/20 border-white/5'}`}>
            <span className="text-[9px] text-red-400 font-bold block mb-1 uppercase tracking-widest">Region B (Target)</span>
            <span className="text-white text-sm font-bold truncate block">
                {regionB ? regionB.name : "Waiting for click..."}
            </span>
          </div>
        </div>

        {/* Metrics Row */}
        {comparisonData && (
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                <div className="text-[8px] text-gray-500 uppercase font-bold mb-1 tracking-tighter">Historical Sync (42yr)</div>
                <div className={`text-xl font-mono font-black ${historicalCorr < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {historicalCorr > 0 ? '+' : ''}{historicalCorr.toFixed(4)}
                </div>
             </div>
             <div className="p-4 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                <div className="text-[8px] text-gray-500 uppercase font-bold mb-1 tracking-tighter">Recent Sync (5yr)</div>
                <div className={`text-xl font-mono font-black ${recentCorr < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {recentCorr > 0 ? '+' : ''}{recentCorr.toFixed(4)}
                </div>
             </div>
          </div>
        )}

        {/* Chart Area */}
        <div className="flex-grow bg-black/40 rounded-2xl border border-white/5 p-5 min-h-[280px] shadow-2xl relative">
          {comparisonData ? (
             // ... existing chart logic ...
             <div className="absolute inset-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={9} 
                            tickFormatter={(val) => viewMode === 'annual' ? val : ''}
                            tick={{ fill: 'rgba(255,255,255,0.3)' }}
                        />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.3)' }} />
                        <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar name={regionA?.name || 'A'} dataKey="valA" fill="#3b82f6" opacity={0.7} radius={[2, 2, 0, 0]} />
                        <Bar name={regionB?.name || 'B'} dataKey="valB" fill="#ef4444" opacity={0.7} radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
          ) : !referenceRegionIdB ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8">
               <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                 <Activity size={32} />
               </div>
               <p className="text-white font-bold text-sm">Select Target Region</p>
               <p className="text-gray-500 text-[11px] mt-2 max-w-[200px]">Click any point on the map to begin historical rainfall comparison with Region A.</p>
             </div>
          ) : hydrationStatus === 'error' ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                <Info size={24} />
              </div>
              <p className="text-red-400 font-bold text-sm">Data Fetch Error</p>
              <p className="text-gray-500 text-[10px] mt-2">The comparison engine couldn't reach the server. Please check your connection or restart the software.</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg border border-white/10 transition-all"
              >
                Reset System
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full border-[3px] border-white/5 border-t-blue-500 animate-spin mb-6" />
              <p className="text-gray-400 font-bold text-sm">Syncing History...</p>
              <p className="text-gray-500 text-[11px] mt-2 max-w-[200px]">Retrieving climatic data for Segment A and Segment B...</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        {comparisonData && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
                <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-blue-400 font-bold text-[10px] uppercase">Climate Insight</h4>
                    <p className="text-xs text-gray-300">
                        Historical complementarity between these regions is driven by global patterns. 
                        Synchronization shifts noted in 1997 and 2015 reflect strong El-Niño phases.
                    </p>
                </div>
            </div>
        )}
      </div>
    </motion.div>
  );
};

export default ComparisonPanel;
