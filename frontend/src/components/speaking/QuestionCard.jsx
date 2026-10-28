// frontend/src/components/speaking/QuestionCard.jsx
import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Mic } from 'lucide-react';

export const QuestionCard = ({ question, part, topic, band }) => (
  <Card className="border-l-4 border-l-primary-500">
    <div className="flex items-center gap-2 mb-4">
      <Badge type="topic">{topic}</Badge>
      <Badge type="band">Band {band}</Badge>
      <span className="text-xs text-gray-400 ml-auto">Part {part}</span>
    </div>
    
    <p className="text-xl text-gray-900 leading-relaxed font-medium">
      {question}
    </p>
    
    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
      <Mic className="h-4 w-4" />
      <span>Speak for 1-2 minutes. Don't worry about mistakes!</span>
    </div>
  </Card>
);