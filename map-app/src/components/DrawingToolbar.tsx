import React from 'react';
import { Square, Diamond, Circle, Trash2, MousePointer2, Type } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface DrawingToolbarProps {
  onModeChange: (mode: string) => void;
  activeMode: string;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ onModeChange, activeMode }) => {
  const tools = [
    { id: 'move', icon: MousePointer2, label: 'Move' },
    { id: 'circle', icon: Circle, label: 'Draw Circle' },
    { id: 'rectangle', icon: Square, label: 'Draw Rectangle' },
  ];

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-panel backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl z-40">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onModeChange(tool.id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium text-sm
            ${activeMode === tool.id 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
              : 'text-white/60 hover:text-white hover:bg-white/5'}
          `}
          title={tool.label}
        >
          <tool.icon size={18} />
          <span>{tool.label}</span>
        </button>
      ))}
      <div className="w-px h-6 bg-white/10 mx-2" />
      <button
        onClick={() => onModeChange('trash')}
        className="p-2.5 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
        title="Delete Selected"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default DrawingToolbar;
