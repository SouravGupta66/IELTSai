// frontend/src/hooks/useWriting.js
import { useState, useCallback } from 'react';
import api from '../services/api';

export const useWriting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prompts, setPrompts] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [score, setScore] = useState(null);

  const fetchPrompts = useCallback(async (topic, band) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/writing/prompts?topic=${topic}&band=${band}`);
      setPrompts(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitEssays = useCallback(async (task1PromptId, task2PromptId, task1Text, task2Text, userId) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(
        `/writing/submit?user_id=${userId}`,
        {
          task1_prompt_id: task1PromptId,
          task2_prompt_id: task2PromptId,
          task1_text: task1Text,
          task2_text: task2Text
        }
      );
      setSubmission(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      const formatted = typeof msg === 'object' ? JSON.stringify(msg) : msg;
      setError(formatted);
      throw new Error(formatted);
    } finally {
      setLoading(false);
    }
  }, []);

  const getScore = useCallback(async (submissionId) => {
    setLoading(true);
    setError(null);
    try {
      // Scoring runs a relevance check (90s cap) + a grading call (240s cap)
      // per task, back to back - up to ~11 min worst case, well past the
      // shared 5-minute default. Timing out here throws away a score the
      // server still finishes and saves.
      const { data } = await api.post(`/writing/score/${submissionId}`, null, { timeout: 12 * 60 * 1000 });
      setScore(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      const formatted = typeof msg === 'object' ? JSON.stringify(msg) : msg;
      setError(formatted);
      throw new Error(formatted);
    } finally {
      setLoading(false);
    }
  }, []);

  return { prompts, submission, score, loading, error, fetchPrompts, submitEssays, getScore };
};