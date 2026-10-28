// frontend/src/components/dashboard/ActivityItem.jsx
import React from 'react';
import { Mic, PenTool, Headphones, BookOpen, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const moduleIcons = {
  speaking: Mic,
  writing: PenTool,
  listening: Headphones,
  reading: BookOpen,
};

const moduleColors = {
  speaking: 'text-indigo-600 bg-indigo-50',
  writing: 'text-green-600 bg-green-50',
  listening: 'text-blue-600 bg-blue-50',
  reading: 'text-purple-600 bg-purple-50',
};

export const ActivityItem = ({ module, score, band, created_at }) => {
  const Icon = moduleIcons[module] || Mic;
  const colorClass = moduleColors[module] || 'text-gray-600 bg-gray-50';
  
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 capitalize">{module} Practice</p>
        <p className="text-xs text-gray-500">
          {created_at ? formatDistanceToNow(new Date(created_at), { addSuffix: true }) : 'Recently'}
        </p>
      </div>
      
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">Band {band || score || '-'}</p>
        <ChevronRight className="w-4 h-4 text-gray-400 inline" />
      </div>
    </div>
  );
};