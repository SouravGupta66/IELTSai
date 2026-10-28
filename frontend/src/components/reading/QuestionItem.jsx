// frontend/src/components/reading/QuestionItem.jsx
import React from 'react';

export const QuestionItem = ({ 
  question, 
  index, 
  answer, 
  onAnswerChange 
}) => {
  const { question_number, question_text, question_type = '', options } = question;

  // Determine how to render primarily from the actual data shape (does it have
  // options?) rather than trusting question_type to exactly match one of a
  // fixed set of strings - AI-generated content doesn't always stick to the
  // exact enum requested (e.g. a type literally came back as "MCQ/T-F-NG"),
  // and matching on that alone left every input silently unrendered.
  const type = question_type.toLowerCase();
  const isMCQ = Array.isArray(options) && options.length > 0;
  const isTrueFalseNG = !isMCQ && (type.includes('t-f-ng') || type.includes('true') || type.includes('false'));
  const isMatching = !isMCQ && !isTrueFalseNG && type.includes('match');

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-6 w-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
          {question_number}
        </span>
        <div className="flex-1">
          <p className="text-gray-900 font-medium mb-3">{question_text}</p>

          {/* Multiple Choice */}
          {isMCQ && (
            <div className="space-y-2">
              {options.map((option, i) => (
                <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question_number}`}
                    value={option}
                    checked={answer === option}
                    onChange={(e) => onAnswerChange(question_number, e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* True/False/Not Given */}
          {isTrueFalseNG && (
            <div className="flex gap-4">
              {['TRUE', 'FALSE', 'NOT GIVEN'].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question_number}`}
                    value={option}
                    checked={answer === option}
                    onChange={(e) => onAnswerChange(question_number, e.target.value)}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* Matching */}
          {isMatching && (
            <input
              type="text"
              value={answer || ''}
              onChange={(e) => onAnswerChange(question_number, e.target.value)}
              placeholder="e.g., A, B, C..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          )}

          {/* Fallback: fill in the blank / short answer / anything unrecognized */}
          {!isMCQ && !isTrueFalseNG && !isMatching && (
            <input
              type="text"
              value={answer || ''}
              onChange={(e) => onAnswerChange(question_number, e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};