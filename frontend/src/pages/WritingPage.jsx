// frontend/src/pages/WritingPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWriting } from '../hooks/useWriting';
import { EssayPrompt } from '../components/writing/EssayPrompt';
import { EssayEditor } from '../components/writing/EssayEditor';
import { Timer } from '../components/writing/Timer';
import { WritingScore } from '../components/writing/WritingScore';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PenLine, ArrowRight, RotateCcw, Send } from 'lucide-react';

const STEPS = { SETUP: 'setup', TASK1: 'task1', TASK2: 'task2', SCORING: 'scoring', RESULTS: 'results' };

const TOPICS = ['travel', 'technology', 'education', 'work', 'environment', 'health'];
const BANDS = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0];

const TASK1_TIME = 20 * 60; // 20 minutes in seconds
const TASK2_TIME = 40 * 60; // 40 minutes in seconds

export const WritingPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(STEPS.SETUP);
  const [config, setConfig] = useState({ topic: 'travel', band: 6.5 });
  const [task1Text, setTask1Text] = useState('');
  const [task2Text, setTask2Text] = useState('');
  const [timeLeft, setTimeLeft] = useState(TASK1_TIME);
  const [currentTask, setCurrentTask] = useState(1);

  const { prompts, submission, score, loading, error, fetchPrompts, submitEssays, getScore } = useWriting();

  // Timer effect
  useEffect(() => {
    if (step !== STEPS.TASK1 && step !== STEPS.TASK2) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNext(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const handleStart = async () => {
    try {
      await fetchPrompts(config.topic, config.band);
      setStep(STEPS.TASK1);
      setTimeLeft(TASK1_TIME);
      setCurrentTask(1);
      setTask1Text('');
      setTask2Text('');
    } catch (err) {
      console.error('Failed to start:', err);
    }
  };

  const handleNext = () => {
    if (currentTask === 1) {
      setStep(STEPS.TASK2);
      setTimeLeft(TASK2_TIME);
      setCurrentTask(2);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setStep(STEPS.SCORING);
    try {
      const userId = user?.id || '00000000-0000-0000-0000-000000000001';
      const task1Prompt = prompts?.find(p => p.task_type === 1);
      const task2Prompt = prompts?.find(p => p.task_type === 2);
      
      if (!task1Prompt?.id || !task2Prompt?.id) {
        throw new Error("Could not find valid writing prompts for submission. Please restart test.");
      }

      const sub = await submitEssays(
        task1Prompt.id,
        task2Prompt.id,
        task1Text,
        task2Text,
        userId
      );
      
      await getScore(sub.id);
      setStep(STEPS.RESULTS);
    } catch (err) {
      console.error('Submit failed:', err);
      setStep(STEPS.TASK2);
    }
  };

  const reset = () => {
    setStep(STEPS.SETUP);
    setTask1Text('');
    setTask2Text('');
    setTimeLeft(TASK1_TIME);
    setCurrentTask(1);
  };

  const currentPrompt = prompts?.find(p => p.task_type === currentTask);
  const wordCount = currentTask === 1 ? task1Text.trim().split(/\s+/).filter(w => w.length > 0).length 
                                      : task2Text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const minWords = currentTask === 1 ? 150 : 250;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <PenLine className="h-8 w-8 text-indigo-600" />
        <h1 className="text-3xl font-bold text-gray-900">Writing Practice</h1>
      </div>

      {/* SETUP */}
      {step === STEPS.SETUP && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-xl font-semibold">Configure Your Test</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.topic}
                onChange={e => setConfig(c => ({ ...c, topic: e.target.value }))}
              >
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Band</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.band}
                onChange={e => setConfig(c => ({ ...c, band: Number(e.target.value) }))}
              >
                {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <strong>Test Structure:</strong><br/>
            • Task 1: 20 minutes, 150 words (chart/graph description)<br/>
            • Task 2: 40 minutes, 250 words (essay)
          </div>

          <Button onClick={handleStart} loading={loading} className="w-full md:w-auto">
            Start Writing Test
            <ArrowRight className="h-4 w-4" />
          </Button>

          {error && <ErrorMessage message={error} onRetry={handleStart} />}
        </div>
      )}

      {/* TASK 1 or TASK 2 */}
      {(step === STEPS.TASK1 || step === STEPS.TASK2) && currentPrompt && (
        <div className="space-y-6">
          {error && <ErrorMessage message={error} />}
          <Timer 
            seconds={timeLeft} 
            totalSeconds={currentTask === 1 ? TASK1_TIME : TASK2_TIME} 
          />
          
          <EssayPrompt
            taskType={currentTask}
            prompt={currentPrompt.prompt_text}
            wordCount={currentTask === 1 ? 150 : 250}
            timeLimit={currentTask === 1 ? 20 : 40}
          />

          <EssayEditor
            value={currentTask === 1 ? task1Text : task2Text}
            onChange={currentTask === 1 ? setTask1Text : setTask2Text}
            placeholder={`Write your ${currentTask === 1 ? 'Task 1' : 'Task 2'} essay here...`}
            disabled={loading}
          />

          <div className="flex items-center justify-between">
            <div className={`text-sm font-medium ${wordCount < minWords ? 'text-amber-600' : 'text-green-600'}`}>
              {wordCount} / {minWords} words minimum
            </div>
            
            <div className="flex gap-3">
              {currentTask === 2 && (
                <Button variant="secondary" onClick={handleSubmit} loading={loading}>
                  <Send className="h-4 w-4" />
                  Submit Both Essays
                </Button>
              )}
              <Button variant="primary" onClick={handleNext} loading={loading}>
                {currentTask === 1 ? 'Next: Task 2' : 'Submit'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SCORING */}
      {step === STEPS.SCORING && (
        <div className="space-y-4">
          <LoadingSpinner message="AI is scoring your essays..." />
          {error && <ErrorMessage message={error} onRetry={handleSubmit} />}
        </div>
      )}

      {/* RESULTS */}
      {step === STEPS.RESULTS && score && (
        <div className="space-y-6">
          <WritingScore scores={score} />
          <div className="flex justify-center">
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Practice Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};