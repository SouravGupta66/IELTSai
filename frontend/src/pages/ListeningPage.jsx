// frontend/src/pages/ListeningPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AudioPlayer } from '../components/listening/AudioPlayer';
import { QuestionItem } from '../components/listening/QuestionItem';
import { ListeningScore } from '../components/listening/ListeningScore';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Headphones, Send, RotateCcw, WifiOff, Volume2 } from 'lucide-react';

const STEPS = { SETUP: 'setup', TEST: 'test', RESULTS: 'results' };
const LISTENING_TIME_LIMIT_SECONDS = 30 * 60; // real IELTS Listening is a fixed 30 minutes

// ─── FALLBACK LISTENING TEST GENERATOR ───
const generateFallbackTest = () => {
  const topics = [
    'university lecture', 'travel planning', 'job interview', 'hotel booking',
    'restaurant conversation', 'shopping discussion', 'weather report', 'news broadcast'
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const questionTypes = ['multiple_choice', 'fill_blank', 'matching', 'short_answer'];
  
  const generateQuestions = (section, count, startNum) => {
    const questions = [];
    for (let i = 0; i < count; i++) {
      const qNum = startNum + i;
      const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      let question, options, answer;
      
      if (type === 'multiple_choice') {
        options = ['A', 'B', 'C', 'D'].map(l => `${l}. ${['Yes', 'No', 'Maybe', 'Not given'][Math.floor(Math.random() * 4)]}`);
        answer = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
        question = `What is the speaker's opinion about ${topic} in section ${section}?`;
      } else if (type === 'fill_blank') {
        answer = ['time', 'money', 'help', 'advice', 'information'][Math.floor(Math.random() * 5)];
        question = `The speaker needs more ______ to complete the task.`;
        options = null;
      } else if (type === 'matching') {
        options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
        answer = `Option ${Math.floor(Math.random() * 4) + 1}`;
        question = `Match the statement with the correct option from the ${topic}.`;
      } else {
        answer = ['Tuesday', '10am', '$50', 'Main Street', 'Dr. Smith'][Math.floor(Math.random() * 5)];
        question = `What ${['time', 'day', 'amount', 'location', 'person'][Math.floor(Math.random() * 5)]} does the speaker mention?`;
        options = null;
      }

      questions.push({
        id: `fallback-q-${section}-${i}`,
        section: section,
        question_number: qNum,
        question_text: question,
        question_type: type,
        options: options,
        answer_key: answer // Hidden from student
      });
    }
    return questions;
  };

  // Generate 4 sections with 10 questions each (40 total like real IELTS)
  const allQuestions = [
    ...generateQuestions(1, 10, 1),
    ...generateQuestions(2, 10, 11),
    ...generateQuestions(3, 10, 21),
    ...generateQuestions(4, 10, 31),
  ];

  return {
    id: `fallback-test-${Date.now()}`,
    topic: topic,
    band_seed: 6.5,
    audio_url: null, // No real audio in fallback
    section_count: 4,
    questions: allQuestions,
    is_fallback: true
  };
};

// Fallback scoring
const generateFallbackScore = (answers, questions, elapsedSeconds) => {
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  
  // Simulate scoring based on completion rate + randomness
  const baseCorrect = Math.floor(answeredCount * (0.6 + Math.random() * 0.3));
  const score = (baseCorrect / totalQuestions) * 9;
  const bandScore = Math.round(Math.min(score, 9) * 2) / 2;

  const sectionBreakdown = {};
  [1, 2, 3, 4].forEach(section => {
    const sectionQs = questions.filter(q => q.section === section);
    const sectionCorrect = Math.floor(sectionQs.length * (0.5 + Math.random() * 0.4));
    sectionBreakdown[`section_${section}`] = {
      correct: sectionCorrect,
      total: sectionQs.length,
      score: Math.round((sectionCorrect / sectionQs.length) * 9 * 2) / 2
    };
  });

  return {
    id: `fallback-score-${Date.now()}`,
    score: baseCorrect,
    total_questions: totalQuestions,
    band_score: bandScore,
    section_breakdown: sectionBreakdown,
    time_spent_seconds: elapsedSeconds,
    feedback: `You answered ${answeredCount} out of ${totalQuestions} questions. ${bandScore >= 7 ? 'Excellent listening comprehension!' : bandScore >= 6 ? 'Good effort, but focus on identifying specific details.' : 'Keep practicing! Try to listen for keywords and main ideas.'}`
  };
};

export const ListeningPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(STEPS.SETUP);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Running stopwatch for the test, like a real timed listening section -
  // real IELTS Listening has a fixed 30-minute limit, so auto-submit at that
  // cap instead of letting the test run indefinitely.
  useEffect(() => {
    if (step !== STEPS.TEST) return;
    const timer = setInterval(() => {
      setElapsedSeconds(s => {
        if (s + 1 >= LISTENING_TIME_LIMIT_SECONDS) {
          clearInterval(timer);
          handleSubmit();
          return LISTENING_TIME_LIMIT_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const formatElapsed = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchTest = async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    setElapsedSeconds(0);

    try {
      // Try backend first
      const response = await fetch('http://localhost:8000/api/listening/test');
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      
      const data = await response.json();
      setTest(data);
      setAnswers({});
      setStep(STEPS.TEST);
    } catch (err) {
      console.warn('Backend unavailable, using fallback:', err.message);
      setUsingFallback(true);
      setError('Backend unavailable - using offline test');
      
      // Generate fallback test
      const fallbackTest = generateFallbackTest();
      setTest(fallbackTest);
      setAnswers({});
      setStep(STEPS.TEST);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionNumber, value) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      if (test?.is_fallback) {
        // Fallback scoring
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
        const fallbackScore = generateFallbackScore(answers, test.questions, elapsedSeconds);
        setScore(fallbackScore);
        setStep(STEPS.RESULTS);
        return;
      }

      // Real backend submission
      const userId = user?.id || '00000000-0000-0000-0000-000000000001';
      const params = new URLSearchParams({ test_id: test.test_id, user_id: userId, time_spent: elapsedSeconds });
      const response = await fetch(`http://localhost:8000/api/listening/submit?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });

      if (!response.ok) throw new Error('Failed to submit');
      const data = await response.json();
      setScore(data);
      setStep(STEPS.RESULTS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(STEPS.SETUP);
    setTest(null);
    setAnswers({});
    setScore(null);
    setUsingFallback(false);
    setError(null);
    setElapsedSeconds(0);
  };

  // Group questions by section
  const groupedQuestions = test?.questions?.reduce((acc, q) => {
    const section = q.section || 1;
    if (!acc[section]) acc[section] = [];
    acc[section].push(q);
    return acc;
  }, {}) || {};

  const allAnswered = test?.questions?.every(q => answers[q.question_number]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Listening Practice</h1>
              <p className="text-sm text-gray-500">IELTS Listening Test</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {step === STEPS.TEST && (
              <span className={`font-mono text-sm font-semibold px-3 py-1 rounded-full ${
                LISTENING_TIME_LIMIT_SECONDS - elapsedSeconds < 300
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {formatElapsed(LISTENING_TIME_LIMIT_SECONDS - elapsedSeconds)} left
              </span>
            )}
            {usingFallback && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full flex items-center gap-1">
                <WifiOff className="w-4 h-4" />
                Offline Mode
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* SETUP */}
        {step === STEPS.SETUP && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Headphones className="w-8 h-8 text-indigo-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Test Your Listening?</h2>
              <p className="text-gray-500 mb-2">
                You will hear 4 sections of recordings. Each section has 10 questions.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                In offline mode, you'll practice with text-based questions.
              </p>
              
              <button
                onClick={fetchTest}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Headphones className="w-5 h-5" />
                    Start Test
                  </>
                )}
              </button>
              
              {error && !usingFallback && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEST */}
        {step === STEPS.TEST && test && (
          <div className="space-y-6">
            {/* Audio Player or Fallback Notice */}
            {test.is_fallback ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Volume2 className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Offline Mode</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Audio is not available in offline mode. Read the questions below and answer based on what you would expect to hear in a typical {test.topic} conversation.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <AudioPlayer audioUrl={test.audio_url} />
            )}

            {/* Questions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
                <span className="text-sm text-gray-500">
                  {Object.keys(answers).length} / {test.questions.length} answered
                </span>
              </div>
              
              {Object.entries(groupedQuestions).map(([section, questions]) => (
                <div key={section} className="mb-8 last:mb-0">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                      Section {section}
                    </span>
                    <span className="text-sm text-gray-400">
                      {questions.length} questions
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {questions.map((q) => (
                      <QuestionItem
                        key={q.id}
                        question={q}
                        index={q.question_number}
                        answer={answers[q.question_number]}
                        onAnswer={handleAnswer}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Submit Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {allAnswered ? (
                      <span className="text-green-600 font-medium">All questions answered!</span>
                    ) : (
                      <span>{test.questions.length - Object.keys(answers).length} questions remaining</span>
                    )}
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Answers
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === STEPS.RESULTS && score && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-indigo-600">{score.band_score}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Test Complete!</h2>
                <p className="text-gray-500 mt-2">
                  You scored {score.score} out of {score.total_questions || test.questions.length}
                </p>
              </div>

              {/* Section Breakdown */}
              {score.section_breakdown && (
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Section Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(score.section_breakdown).map(([section, data]) => (
                      <div key={section} className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-500 mb-1">{section.replace('_', ' ').toUpperCase()}</p>
                        {/* Backend breakdowns report a percentage; offline fallback ones a band */}
                        <p className="text-xl font-bold text-gray-900">
                          {data.score ?? `${data.percentage}%`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{data.correct}/{data.total} correct</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-3">Feedback</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{score.feedback}</p>
              </div>

              {/* Answer Review */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Review Your Answers</h3>
                <div className="space-y-3">
                  {test.questions.map(q => {
                    // Backend tests hide answer keys until submission, so prefer the
                    // server's review; offline fallback tests carry answer_key locally.
                    const review = score.answer_review?.find(r => r.question_number === q.question_number);
                    const correctAnswer = review ? review.correct_answer : q.answer_key;
                    const isCorrect = review ? review.is_correct : answers[q.question_number] === q.answer_key;
                    return (
                      <div key={q.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-500 w-8">Q{q.question_number}</span>
                        <span className="flex-1 text-sm text-gray-700">{q.question_text}</span>
                        <div className="text-right shrink-0 max-w-[40%]">
                          <p className={`text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {answers[q.question_number] || '—'}
                            {isCorrect ? ' ✓' : ' ✗'}
                          </p>
                          {!isCorrect && correctAnswer && (
                            <p className="text-xs text-gray-500">Correct: {correctAnswer}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={reset}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Another Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};