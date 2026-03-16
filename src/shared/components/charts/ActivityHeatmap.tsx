import React from 'react';
import { MOCK_HEATMAP_DATA } from '@/constants';

// Helper to get color intensity
const getColor = (value: number) => {
  if (value === 0) return 'bg-slate-100';
  if (value < 25) return 'bg-indigo-100';
  if (value < 50) return 'bg-indigo-300';
  if (value < 75) return 'bg-indigo-400';
  return 'bg-indigo-600';
};

const ActivityHeatmap: React.FC = () => {
  // Data is flat, let's group by Day for rendering rows
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex mb-2">
          <div className="w-10"></div> {/* Spacer for row labels */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex-1 text-[10px] text-slate-400 text-center font-mono">{i}</div>
          ))}
        </div>

        {days.map((day) => (
          <div key={day} className="flex items-center mb-1">
            <div className="w-10 text-xs text-slate-500 font-medium">{day}</div>
            {MOCK_HEATMAP_DATA
              .filter(d => d.day === day)
              .sort((a, b) => a.hour - b.hour)
              .map((item, idx) => (
                <div
                  key={`${day}-${idx}`}
                  className={`flex-1 aspect-square mx-[1px] rounded-sm ${getColor(item.value)} transition-all hover:ring-2 hover:ring-indigo-400 hover:z-10 relative group cursor-pointer`}
                  title={`${day} ${item.hour}:00 - Activity: ${item.value}`}
                >
                </div>
              ))}
          </div>
        ))}

        <div className="flex justify-end items-center gap-2 mt-4 text-xs text-slate-400 font-mono">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-slate-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
