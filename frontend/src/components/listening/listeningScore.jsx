// frontend/src/components/listening/ListeningScore.jsx
import React from 'react';
import { Card } from '../common/Card';
import { Trophy, CheckCircle, XCircle } from 'lucide-react';

export const ListeningScore = ({ score }) => {
  if (!score) return null;

  return (
    <div className="space-y-4">
      <Card className="text-center border-t-4 border-t-green-500">
        <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <div className="text-6xl font-bold text-gray-900">{score.band_score}</div>
        <div className="text-gray-500 mt-1">Band Score</div>
        <div className="text-sm text-gray-400 mt-2">
          {score.score} / {score.total_questions} correct
        </div>
      </Card>

      {score.section_breakdown && (
        <Card title="Section Breakdown">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(score.section_breakdown).map(([key, data]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">
                  {data.percentage}%
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {key.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-400">
                  {data.correct}/{data.total}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {score.time_spent && (
        <div className="text-center text-sm text-gray-500">
          Time spent: {Math.floor(score.time_spent / 60)}m {score.time_spent % 60}s
        </div>
      )}
    </div>
  );
};