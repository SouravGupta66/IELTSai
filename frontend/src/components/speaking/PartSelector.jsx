// frontend/src/components/speaking/PartSelector.jsx
import React from 'react';
import { Clock, MessageCircle } from 'lucide-react';

export const PartSelector = ({ part, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all
        ${isSelected 
          ? 'border-indigo-600 bg-indigo-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`
              px-2 py-1 rounded text-xs font-bold
              ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}
            `}>
              Part {part.id}
            </span>
            <h3 className="font-semibold text-gray-900">{part.name}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-2">{part.description}</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          {Math.floor(part.duration / 60)}m
        </div>
      </div>
    </button>
  );
};