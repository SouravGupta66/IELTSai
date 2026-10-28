// frontend/src/components/writing/WritingScore.jsx
import React from 'react';
import { Card } from '../common/Card';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

export const WritingScore = ({ scores }) => {
  if (!scores) return null;

  const criteria = [
    { key: 'task_achievement', label: 'Task Achievement' },
    { key: 'coherence', label: 'Coherence & Cohesion' },
    { key: 'lexical_resource', label: 'Lexical Resource' },
    { key: 'grammatical_range', label: 'Grammar' },
  ];

  return (
    <div className="space-y-4">
      <Card className="text-center border-t-4 border-t-green-500">
        <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <div className="text-6xl font-bold text-gray-900">{scores.overall_band}</div>
        <div className="text-gray-500 mt-1">Overall Band Score</div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {criteria.map(({ key, label }) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{scores[key]}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {scores.feedback && (
        <Card title="Feedback">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{scores.feedback}</p>
        </Card>
      )}

      {scores.corrections?.length > 0 && (
        <Card title="Corrections" className="border-l-4 border-l-amber-500">
          <ul className="space-y-2">
            {scores.corrections.map((c, i) => (
              <li key={i} className="text-sm text-gray-600 bg-amber-50 p-2 rounded">{c}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};