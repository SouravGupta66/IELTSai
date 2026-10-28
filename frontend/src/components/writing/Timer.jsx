// frontend/src/components/writing/Timer.jsx
import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

export const Timer = ({ seconds, totalSeconds }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds < 300; // Less than 5 minutes
  
  const percentage = (seconds / totalSeconds) * 100;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg ${
      isWarning ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
    }`}>
      <Clock className={`h-5 w-5 ${isWarning ? 'text-red-500' : 'text-blue-500'}`} />
      
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className={`text-sm font-medium ${isWarning ? 'text-red-700' : 'text-blue-700'}`}>
            Time Remaining
          </span>
          <span className={`text-lg font-bold ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      {isWarning && <AlertCircle className="h-5 w-5 text-red-500" />}
    </div>
  );
};