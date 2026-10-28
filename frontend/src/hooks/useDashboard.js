// frontend/src/hooks/useDashboard.js
import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api';

export const useDashboard = (userId) => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        
        // Fetch user progress
        const statsRes = await fetch(`${API_URL}/dashboard/stats/${userId}`);
        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsRes.json();

        // Fetch recent activity
        const recentRes = await fetch(`${API_URL}/dashboard/recent/${userId}`);
        if (!recentRes.ok) throw new Error('Failed to fetch activity');
        const recentData = await recentRes.json();

        const bestScores = Object.values(statsData.best_scores || {});
        setStats({
          ...statsData,
          tests_completed: statsData.total_tests || 0,
          best_band: bestScores.length ? Math.max(...bestScores) : 0,
        });
        setRecent(recentData.slice(0, 4));
      } catch (err) {
        setError(err.message);
        setStats({
          total_tests: 4,
          tests_completed: 4,
          average_band: 6.5,
          best_band: 7.0,
          progress: {
            speaking: 6.5,
            writing: 6.0,
            listening: 7.0,
            reading: 6.5,
          }
        });
        // Multi-module fallback activities
        setRecent([
          { module: 'speaking', type: 'speaking', score: 6.5, band: 6.5, created_at: new Date(Date.now() - 3600000).toISOString() },
          { module: 'writing', type: 'writing', score: 6.0, band: 6.0, created_at: new Date(Date.now() - 86400000).toISOString() },
          { module: 'listening', type: 'listening', score: 7.0, band: 7.0, created_at: new Date(Date.now() - 172800000).toISOString() },
          { module: 'reading', type: 'reading', score: 6.5, band: 6.5, created_at: new Date(Date.now() - 259200000).toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchDashboard();
    }
  }, [userId]);

  return { stats, recent, loading, error };
};