// frontend/src/components/listening/QuestionItem.jsx
import React from 'react';

export const QuestionItem = ({ question, index, answer, onAnswer, disabled }) => {
  const { question_text, question_type, options } = question;

  return (
    <div className={`p-4 rounded-lg border ${disabled ? 'bg-gray-50 opacity-60' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-medium">
          {index}
        </span>
        <div className="flex-1">
          <p className="text-gray-900 mb-3">{question_text}</p>
          
          {question_type === 'multiple_choice' && options && (
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !disabled && onAnswer(index, opt.charAt(0))}
                  className={`p-2 rounded-lg text-sm text-left border transition-colors ${
                    answer === opt.charAt(0)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  disabled={disabled}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          
          {question_type === 'fill_blank' && (
            <input
              type="text"
              value={answer || ''}
              onChange={(e) => !disabled && onAnswer(index, e.target.value)}
              placeholder="Type your answer..."
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          )}
          
          {(question_type === 'matching' || question_type === 'short_answer') && (
            <input
              type="text"
              value={answer || ''}
              onChange={(e) => !disabled && onAnswer(index, e.target.value)}
              placeholder="Your answer..."
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};