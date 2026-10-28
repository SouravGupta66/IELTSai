// frontend/src/components/speaking/ChatBubble.jsx
import React from 'react';
import { User, Bot } from 'lucide-react';

export const ChatBubble = ({ role, text, type }) => {
  const isAi = role === 'ai';
  
  const typeStyles = {
    greeting: 'bg-indigo-50 border-indigo-200',
    followup: 'bg-blue-50 border-blue-200',
    closing: 'bg-green-50 border-green-200',
    response: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`flex gap-3 ${isAi ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isAi ? 'bg-indigo-600' : 'bg-gray-400'}
      `}>
        {isAi ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`
        max-w-[80%] px-4 py-3 rounded-2xl border
        ${typeStyles[type] || 'bg-gray-50 border-gray-200'}
        ${isAi ? 'rounded-tl-sm' : 'rounded-tr-sm'}
      `}>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{text}</p>
        <span className="text-xs text-gray-400 mt-1 block">
          {isAi ? 'Examiner' : 'You'}
        </span>
      </div>
    </div>
  );
};