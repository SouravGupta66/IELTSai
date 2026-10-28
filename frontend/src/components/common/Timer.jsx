// frontend/src/components/common/Timer.jsx
import React from 'react';
import { Clock } from 'lucide-react';

export const Timer = ({ timeLeft, totalTime }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = totalTime ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const isLow = timeLeft < 60; // Less than 1 minute
  const isCritical = timeLeft < 10; // Less than 10 seconds

  return (
    <div className="flex items-center gap-2">
      <Clock className={`w-5 h-5 ${isCritical ? 'text-red-500 animate-pulse' : isLow ? 'text-amber-500' : 'text-gray-500'}`} />
      <span className={`
        font-mono font-bold text-lg
        ${isCritical ? 'text-red-600 animate-pulse' : isLow ? 'text-amber-600' : 'text-gray-900'}
      `}>
        {formatTime(timeLeft)}
      </span>
      {/* Progress bar */}
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${100 - percentage}%` }}
        />
      </div>
    </div>
  );
};