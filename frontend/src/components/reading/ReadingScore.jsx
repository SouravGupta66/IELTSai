// frontend/src/components/reading/ReadingScore.jsx
import React from 'react';
import { Card } from '../common/Card';
import { Trophy, CheckCircle, XCircle } from 'lucide-react';

export const ReadingScore = ({ score }) => {
  if (!score) return null;

  const getBandColor = (band) => {
    if (band >= 7) return 'text-green-600';
    if (band >= 6) return 'text-blue-600';
    if (band >= 5) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <Card className="text-center border-t-4 border-t-purple-500">
        <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
        <div className={`text-6xl font-bold ${getBandColor(score.band_score)}`}>
          {score.band_score}
        </div>
        <div className="text-gray-500 mt-1">Band Score</div>
        <div className="text-sm text-gray-400 mt-2">
          {score.score} / {score.total_questions} correct
        </div>
      </Card>

      {score.feedback && (
        <Card title="Feedback">
          <p className="text-sm text-gray-600 leading-relaxed">{score.feedback}</p>
        </Card>
      )}

      <Card title="Answer Breakdown">
        <div className="space-y-2">
          {Object.entries(score.per_question_breakdown).map(([num, data]) => (
            <div key={num} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <span className="text-sm font-medium">Q{num}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">You: {data.student_answer}</span>
                {data.correct ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Ans: {data.correct_answer}</span>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};