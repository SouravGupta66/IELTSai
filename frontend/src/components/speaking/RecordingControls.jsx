// frontend/src/components/speaking/RecordingControls.jsx
import React from 'react';
import { Mic, Square } from 'lucide-react';

export const RecordingControls = ({ isRecording, onStart, onStop, disabled }) => {
  if (isRecording) {
    return (
      <button
        onClick={onStop}
        className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg animate-pulse transition-colors"
      >
        <Square className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full flex items-center justify-center shadow-lg transition-colors"
    >
      <Mic className="w-6 h-6 text-white" />
    </button>
  );
};