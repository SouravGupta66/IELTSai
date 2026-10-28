// frontend/src/hooks/useReading.js
import { useState, useCallback } from 'react';
import api from '../services/api';

export const useReading = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passage, setPassage] = useState(null);
  const [score, setScore] = useState(null);

  const fetchPassage = useCallback(async (topic, band) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/reading/passage?topic=${topic}&band=${band}`);
      setPassage(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswers = useCallback(async (passageId, userId, answers) => {
    setLoading(true);
    try {
      const { data } = await api.post(
        `/reading/submit?passage_id=${passageId}&user_id=${userId}`,
        answers
      );
      setScore(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { passage, score, loading, error, fetchPassage, submitAnswers };
};