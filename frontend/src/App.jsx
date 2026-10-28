// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WritingPage } from './pages/WritingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SpeakingPage } from './pages/SpeakingPage';
import { ReadingPage } from './pages/ReadingPage';
import { ListeningPage } from './pages/ListeningPage'; // ✅ Add this import
import { Mic, PenLine, Headphones, BookOpen, BarChart3, LogOut, User, Sparkles, Target, Clock, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import heroStudentImage from './assets/hero-student.jpg';

// ─── Protected Route ───
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();

  // Wait for the real user to be restored from the token before rendering
  // children - otherwise pages briefly render with user=null and fall back
  // to the placeholder UUID.
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
};

// ─── Navbar ───
const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/speaking', label: 'Speaking', icon: Mic },
    { path: '/writing', label: 'Writing', icon: PenLine },
    { path: '/listening', label: 'Listening', icon: Headphones },
    { path: '/reading', label: 'Reading', icon: BookOpen },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">IELTS AI</span>
          </Link>

          <div className="flex items-center gap-1">
            {user && navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user.name}</span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// ─── Home Page ───
const MODULES = [
  { title: 'Speaking', desc: 'Real cue-card format with a 1-minute prep timer, just like the real test. Talk to an AI examiner and get feedback on fluency, vocabulary, grammar, and pronunciation.', color: 'red', icon: Mic },
  { title: 'Writing', desc: 'Task 1 and Task 2 prompts scored on Task Achievement, Coherence, Lexical Resource, and Grammar - with detailed, sentence-level corrections.', color: 'blue', icon: PenLine },
  { title: 'Listening', desc: 'Four sections of increasing difficulty with real narrated audio and a 30-minute timer, scored against an IELTS band-conversion table.', color: 'green', icon: Headphones },
  { title: 'Reading', desc: 'Academic passages with multiple question types, auto-scored and banded the same way as the real Reading paper.', color: 'purple', icon: BookOpen },
];

const COLOR_STYLES = {
  red: 'bg-red-50 text-red-700 border-red-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

const HOW_IT_WORKS = [
  { step: '1', title: 'Pick a module', desc: 'Choose Speaking, Writing, Listening, or Reading - each generated fresh, in real Cambridge exam format.' },
  { step: '2', title: 'Practice for real', desc: 'Timed sections, real cue cards, real audio - built to match the actual test conditions, not a watered-down quiz.' },
  { step: '3', title: 'Get an instant band score', desc: 'AI-scored feedback against the official IELTS criteria, with specific, actionable notes on what to improve.' },
];

const HomePage = () => {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome back, {user.name}!</h1>
        <p className="text-lg text-gray-600 mb-8">Ready to keep pushing toward your target band?</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          <BarChart3 className="h-5 w-5" />
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background photo, faded to a soft "shadow" so it doesn't compete with the text */}
        <div
          className="absolute inset-0 bg-cover bg-top"
          style={{ backgroundImage: `url(${heroStudentImage})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-linear-to-b from-white/20 via-white/70 to-white" aria-hidden="true" />

        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 shadow-sm text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            AI-powered practice for all 4 IELTS modules
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Practice IELTS the way<br className="hidden md:block" /> you'll actually be tested
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
            Speaking, Writing, Listening, and Reading practice generated in real Cambridge exam
            format - with instant, criteria-based band scoring so you know exactly where you stand.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Target, label: 'All 4 skills covered' },
            { icon: Clock, label: 'Real exam timing' },
            { icon: CheckCircle2, label: 'Instant band scoring' },
            { icon: ShieldCheck, label: 'Runs on local AI' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Everything you need, in one place</h2>
        <p className="text-gray-500 text-center mb-10">Four modules, one consistent practice experience.</p>
        <div className="grid md:grid-cols-2 gap-5">
          {MODULES.map(({ title, desc, color, icon: Icon }) => (
            <div
              key={title}
              className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${COLOR_STYLES[color]}`}
            >
              <Icon className="h-8 w-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Ready to find out your band score?
        </h2>
        <p className="text-gray-500 mb-8">Create a free account and start practicing in under a minute.</p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Get Started Free
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
};

// ❌ REMOVED: Placeholder components that were overriding real imports
// const ListeningPage = () => <PlaceholderPage title="Listening Practice" icon="🎧" />;
// const ReadingPage = () => <PlaceholderPage title="Reading Practice" icon="📖" />;

// ❌ REMOVED: PlaceholderPage component (no longer needed)
// const PlaceholderPage = ({ title, icon }) => (
//   <div className="max-w-3xl mx-auto px-4 py-16 text-center">
//     <div className="text-6xl mb-4">{icon}</div>
//     <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
//     <p className="text-gray-500 mb-8">Coming soon...</p>
//     <Link to="/dashboard" className="text-indigo-600 hover:underline">
//       ← Back to Dashboard
//     </Link>
//   </div>
// );

// ─── Main App ───
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/speaking" element={
              <ProtectedRoute>
                <SpeakingPage />
              </ProtectedRoute>
            } />
            <Route path="/writing" element={
              <ProtectedRoute>
                <WritingPage />
              </ProtectedRoute>
            } />
            <Route path="/listening" element={
              <ProtectedRoute>
                <ListeningPage />
              </ProtectedRoute>
            } />
            <Route path="/reading" element={
              <ProtectedRoute>
                <ReadingPage />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  </AuthProvider>
);

export default App;