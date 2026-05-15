import React from 'react';

const Legend: React.FC = () => {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-96 glass rounded-2xl p-5 border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between text-[10px] text-gray-400 mb-3 uppercase tracking-widest font-extrabold">
        <span className="text-[#ff2975]">Complementary</span>
        <span>Neutral</span>
        <span className="text-[#00d2ff]">Positive</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#ff2975] via-gray-700 to-[#00d2ff]" />
      <div className="flex justify-between text-xs font-mono mt-2 text-gray-400">
        <span>-1.0</span>
        <span>0.0</span>
        <span>+1.0</span>
      </div>
    </div>

  );
};

export default Legend;
