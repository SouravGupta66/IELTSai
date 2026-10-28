// frontend/src/hooks/useListening.js
import { useState, useCallback } from 'react';
import api from '../services/api';

export const useListening = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);
  const [score, setScore] = useState(null);

  const fetchTest = useCallback(async (topic, band) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/listening/test?topic=${topic}&band=${band}`);
      setTest(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswers = useCallback(async (testId, userId, answers, timeSpent) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ test_id: testId, user_id: userId });
      if (timeSpent != null) params.set('time_spent', timeSpent);
      const { data } = await api.post(`/listening/submit?${params}`, answers);
      setScore(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { test, score, loading, error, fetchTest, submitAnswers };
};