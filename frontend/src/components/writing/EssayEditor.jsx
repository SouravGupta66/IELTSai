// frontend/src/components/writing/EssayEditor.jsx
import React from 'react';
import { PenLine } from 'lucide-react';

export const EssayEditor = ({ value, onChange, placeholder, disabled }) => {
  const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <PenLine className="h-4 w-4" />
          Your Essay
        </div>
        <div className={`text-sm font-medium ${
          wordCount < 150 ? 'text-amber-600' : 'text-green-600'
        }`}>
          {wordCount} words
        </div>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full h-64 p-4 resize-none outline-none text-gray-700 leading-relaxed"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};