// frontend/src/pages/ReadingPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReading } from '../hooks/useReading';
import { PassageDisplay } from '../components/reading/PassageDisplay';
import { QuestionItem } from '../components/reading/QuestionItem';
import { ReadingScore } from '../components/reading/ReadingScore';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { BookOpen, ArrowRight, RotateCcw, Timer, Layers } from 'lucide-react';

const TOPICS = ['science', 'history', 'technology', 'environment', 'education', 'health'];
const BANDS = [5.0, 6.0, 6.5, 7.0, 7.5, 8.0];

export const ReadingPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState('setup'); // setup, reading, results
  const [config, setConfig] = useState({ topic: 'science', band: 6.5 });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  
  const { passage, score, loading, error, fetchPassage, submitAnswers } = useReading();

  // Timer
  useEffect(() => {
    let timer;
    if (step === 'reading' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await fetchPassage(config.topic, config.band);
      setStep('reading');
      setTimeLeft(3600);
      setAnswers({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnswerChange = (questionNumber, value) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };

  const handleSubmit = async () => {
    if (!passage) return;
    
    try {
      await submitAnswers(
        passage.id,
        user?.id || '00000000-0000-0000-0000-000000000001',
        answers
      );
      setStep('results');
    } catch (err) {
      console.error(err);
    }
  };

  const reset = () => {
    setStep('setup');
    setAnswers({});
    setTimeLeft(3600);
  };

  const allAnswered = passage?.questions?.every(q => answers[q.question_number]);

  return (
    <div className={`mx-auto px-4 py-6 ${step === 'reading' ? 'max-w-[1600px]' : 'max-w-4xl'}`}>
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Reading Practice
            {step === 'reading' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Split-Screen Exam Mode
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* SETUP */}
      {step === 'setup' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-xl font-semibold">Configure Your Test</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none capitalize"
                value={config.topic}
                onChange={e => setConfig(c => ({ ...c, topic: e.target.value }))}
              >
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Band</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                value={config.band}
                onChange={e => setConfig(c => ({ ...c, band: Number(e.target.value) }))}
              >
                {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <Button onClick={handleStart} loading={loading} className="w-full md:w-auto">
            Start Split-Screen Reading Test
            <ArrowRight className="h-4 w-4" />
          </Button>

          {error && <ErrorMessage message={error} onRetry={handleStart} />}
        </div>
      )}

      {/* SPLIT SCREEN COMPUTER-BASED IELTS READING MODE */}
      {step === 'reading' && passage && (
        <div className="space-y-4">
          {/* Top Sticky Test Bar */}
          <div className="sticky top-16 bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 flex items-center justify-between z-40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Timer className="h-4 w-4 text-gray-600" />
                <span className={`font-mono font-bold text-sm ${timeLeft < 300 ? 'text-rose-600 animate-pulse' : 'text-gray-900'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-600 hidden sm:inline">
                {passage.title}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-gray-600">
                {Object.keys(answers).length} / {passage.questions.length} Answered
              </span>
              <Button 
                onClick={handleSubmit} 
                disabled={!allAnswered || loading}
                variant={allAnswered ? 'primary' : 'secondary'}
                size="sm"
              >
                Submit Test
              </Button>
            </div>
          </div>

          {/* Dual-Pane Split Screen Grid */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Left Pane: Reading Passage (Sticky / Scrollable) */}
            <div className="lg:sticky lg:top-36 max-h-[calc(100vh-170px)] overflow-y-auto pr-1">
              <PassageDisplay 
                title={passage.title}
                passageText={passage.passage_text}
                wordCount={passage.word_count}
                topic={passage.topic}
                band={passage.band_seed}
              />
            </div>

            {/* Right Pane: Questions List (Scrollable) */}
            <div className="space-y-4 max-h-[calc(100vh-170px)] overflow-y-auto pl-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Comprehension Questions</h3>
                <span className="text-xs text-gray-500 font-mono">
                  {passage.questions.length} Questions Total
                </span>
              </div>
              
              {passage.questions.map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  answer={answers[question.question_number]}
                  onAnswerChange={(_, value) => handleAnswerChange(question.question_number, value)}
                />
              ))}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">
                    {Object.keys(answers).length} of {passage.questions.length} answered
                  </span>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!allAnswered || loading}
                    loading={loading}
                    size="sm"
                  >
                    Submit All Answers
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {step === 'results' && score && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <ReadingScore score={score} />

          <div className="flex gap-4">
            <Button onClick={reset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Another Passage
            </Button>
            <Button onClick={() => setStep('reading')} variant="secondary">
              Review Answers & Passage
            </Button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && step !== 'setup' && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* ERROR STATE */}
      {error && step !== 'setup' && (
        <ErrorMessage 
          message={error} 
          onRetry={() => {
            if (step === 'reading') handleStart();
          }} 
        />
      )}
    </div>
  );
};