// frontend/src/pages/DashboardPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { ProgressBar } from '../components/dashboard/ProgressBar';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityItem } from '../components/dashboard/ActivityItem';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { BookOpen, Mic, Headphones, PenTool, TrendingUp, Award, Clock, Target } from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Use real user ID from auth, fallback for development
  const userId = user?.id || '00000000-0000-0000-0000-000000000001';
  
  const { stats, recent, loading, error } = useDashboard(userId);

  // Redirect if not authenticated (optional)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your dashboard</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
        >
          Retry
        </button>
      </div>
    </div>
  );
  
  if (!stats) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">No data available</p>
    </div>
  );

  // Module cards for quick navigation
  const modules = [
    { 
      name: 'Speaking', 
      icon: Mic, 
      color: 'indigo', 
      path: '/speaking',
      description: 'Practice with AI examiner'
    },
    { 
      name: 'Writing', 
      icon: PenTool, 
      color: 'green', 
      path: '/writing',
      description: 'Essay writing tasks'
    },
    { 
      name: 'Listening', 
      icon: Headphones, 
      color: 'blue', 
      path: '/listening',
      description: 'Audio comprehension tests'
    },
    { 
      name: 'Reading', 
      icon: BookOpen, 
      color: 'purple', 
      path: '/reading',
      description: 'Passage analysis practice'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name || 'Student'}!
              </h1>
              <p className="text-gray-500 mt-1">
                Target Band: <span className="font-semibold text-indigo-600">{user?.target_band || '6.5'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Target className="w-4 h-4" />
              <span>Keep practicing to reach your goal!</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Start - Module Cards */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start Practicing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modules.map(module => (
              <button
                key={module.name}
                onClick={() => navigate(module.path)}
                className={`
                  bg-white p-6 rounded-xl border-2 border-gray-100 
                  hover:border-${module.color}-500 hover:shadow-md
                  transition-all text-left group
                `}
              >
                <div className={`
                  w-12 h-12 rounded-lg bg-${module.color}-100 
                  flex items-center justify-center mb-4
                  group-hover:bg-${module.color}-200 transition-colors
                `}>
                  <module.icon className={`w-6 h-6 text-${module.color}-600`} />
                </div>
                <h3 className="font-semibold text-gray-900">{module.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{module.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Stats Overview */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon={<Clock className="w-5 h-5" />} 
              label="Total Tests" 
              value={stats.total_tests || 0} 
              color="gray"
            />
            <StatCard 
              icon={<TrendingUp className="w-5 h-5" />} 
              label="Tests Completed" 
              value={stats.tests_completed || 0} 
              color="blue"
            />
            <StatCard 
              icon={<Award className="w-5 h-5" />} 
              label="Average Band" 
              value={stats.average_band || '-'} 
              color="green"
            />
            <StatCard 
              icon={<Target className="w-5 h-5" />} 
              label="Best Band" 
              value={stats.best_band || '-'} 
              color="purple"
            />
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Progress by Skill */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Skill Progress</h2>
            <div className="space-y-5">
              <ProgressBar 
                label="Speaking" 
                score={stats.progress?.speaking || 0} 
                color="indigo" 
              />
              <ProgressBar 
                label="Writing" 
                score={stats.progress?.writing || 0} 
                color="green" 
              />
              <ProgressBar 
                label="Listening" 
                score={stats.progress?.listening || 0} 
                color="blue" 
              />
              <ProgressBar 
                label="Reading" 
                score={stats.progress?.reading || 0} 
                color="purple" 
              />
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {recent && recent.length > 0 ? (
                recent.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No recent activity yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Start your first practice test!</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Tips Section */}
        <section className="bg-indigo-50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">💡 Tip of the Day</h2>
          <p className="text-indigo-700">
            Consistent practice is key to improving your IELTS score. Try to practice at least one module daily!
          </p>
        </section>
      </div>
    </div>
  );
};