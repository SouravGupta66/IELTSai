// frontend/src/components/writing/EssayPrompt.jsx
import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Clock, FileText } from 'lucide-react';
import { Task1ChartVisualizer } from './Task1ChartVisualizer';

export const EssayPrompt = ({ taskType, prompt, wordCount, timeLimit, topic = 'travel' }) => (
  <Card className="border-l-4 border-l-blue-500">
    <div className="flex items-center gap-2 mb-4">
      <Badge type="topic">Task {taskType}</Badge>
      <Badge type="band">{wordCount} words minimum</Badge>
      <div className="flex items-center gap-1 text-sm text-gray-500 ml-auto">
        <Clock className="h-4 w-4" />
        {timeLimit} min
      </div>
    </div>
    
    <div className="flex items-start gap-3">
      <FileText className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
      <p className="text-lg text-gray-900 font-medium leading-relaxed">{prompt}</p>
    </div>

    {/* Render Visual IELTS Chart for Task 1 */}
    {taskType === 1 && (
      <Task1ChartVisualizer topic={topic} />
    )}
  </Card>
);