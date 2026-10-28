// frontend/src/components/speaking/ScoreDisplay.jsx
import React, { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Star, MessageSquare, BookOpen, CheckCircle, AlertTriangle, Zap, Gauge, Flame, Sparkles } from 'lucide-react';

const getScoreStyle = (score) => {
  if (score >= 7.5) return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'bg-emerald-600 text-white' };
  if (score >= 6.5) return { bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', badge: 'bg-indigo-600 text-white' };
  if (score >= 5.5) return { bg: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'bg-amber-600 text-white' };
  return { bg: 'bg-rose-50 border-rose-200 text-rose-700', badge: 'bg-rose-600 text-white' };
};

export const ScoreDisplay = ({ score }) => {
  const [activeTab, setActiveTab] = useState('overview');
  if (!score) return null;

  const band = score.band_score ?? score.overall_band ?? 6.0;
  const fluency = score.fluency_score ?? score.fluency ?? band;
  const vocab = score.vocab_score ?? score.vocabulary ?? band;
  const grammar = score.grammar_score ?? score.grammar ?? band;
  const pronunciation = score.pronunciation_score ?? score.pronunciation ?? band;
  const coherence = score.coherence_score ?? score.coherence ?? band;

  const criteriaList = [
    { id: 'fluency', label: 'Fluency & Coherence', score: fluency, feedback: score.fluency_feedback, icon: MessageSquare },
    { id: 'vocab', label: 'Lexical Resource', score: vocab, feedback: score.vocab_feedback, icon: BookOpen },
    { id: 'grammar', label: 'Grammatical Range', score: grammar, feedback: score.grammar_feedback, icon: CheckCircle },
    { id: 'pronunciation', label: 'Pronunciation', score: pronunciation, feedback: score.pronunciation_feedback, icon: Sparkles },
  ];

  const metrics = score.speech_metrics;

  return (
    <div className="space-y-6">
      {/* Overall Score Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-8 shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-1">
              <div className="w-full h-full bg-slate-900 rounded-full flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  {band}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">BAND</span>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Official IELTS Speaking Score</h2>
            <p className="text-slate-300 text-sm mt-1">
              Evaluated strictly according to official British Council & IDP rubrics
            </p>
          </div>
        </div>

        {/* Speech Performance Analytics Badges */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/10">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">Word Count</p>
              <p className="text-lg font-bold text-cyan-300">{metrics.total_words || '-'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/10">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">Pace (WPM)</p>
              <p className="text-lg font-bold text-emerald-300">{metrics.wpm || '-'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/10 col-span-2 sm:col-span-1">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider">Hesitations</p>
              <p className={`text-lg font-bold ${metrics.filler_count > 3 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {metrics.filler_count ?? 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4 Official IELTS Criteria Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {criteriaList.map((c) => {
          const style = getScoreStyle(c.score);
          const Icon = c.icon;
          return (
            <div key={c.id} className={`p-4 rounded-xl border ${style.bg} transition-all shadow-sm flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 opacity-80" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.badge}`}>
                  {c.score}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium opacity-80">{c.label}</p>
                <div className="w-full bg-black/10 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="h-full bg-current rounded-full transition-all duration-700" style={{ width: `${(c.score / 9) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Analysis Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Overview & Criteria
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'vocabulary' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Vocabulary Upgrades ({score.vocabulary_upgrades?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('grammar')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'grammar' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> Grammar Diffs ({score.grammar_corrections?.length || 0})
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: OVERVIEW & CRITERIA */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {score.feedback && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-indigo-900 mb-1 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-indigo-600" /> Examiner Evaluation Summary
                  </h4>
                  <p className="text-sm text-indigo-950 leading-relaxed">{score.feedback}</p>
                </div>
              )}

              {/* Individual Criteria Feedback List */}
              <div className="space-y-3">
                {criteriaList.map((c) => (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">{c.label}</span>
                      <span className="text-xs font-bold text-indigo-600">Band {c.score}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {c.feedback || `Performance aligned with IELTS Band ${c.score} standards for ${c.label}.`}
                    </p>
                  </div>
                ))}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                {score.strengths?.length > 0 && (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                    <h4 className="flex items-center gap-2 font-bold text-emerald-800 text-sm mb-3">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Key Strengths
                    </h4>
                    <ul className="space-y-2">
                      {score.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-emerald-900">
                          <Star className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {score.weaknesses?.length > 0 && (
                  <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4">
                    <h4 className="flex items-center gap-2 font-bold text-rose-800 text-sm mb-3">
                      <TrendingDown className="h-4 w-4 text-rose-600" /> Areas to Upgrade
                    </h4>
                    <ul className="space-y-2">
                      {score.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-rose-900">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VOCABULARY UPGRADES */}
          {activeTab === 'vocabulary' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-4">
                Elevate your Lexical Resource score by substituting basic words with these Band 7.5+ academic collocations and idioms:
              </p>
              {score.vocabulary_upgrades?.length > 0 ? (
                <div className="space-y-3">
                  {score.vocabulary_upgrades.map((v, i) => (
                    <div key={i} className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 line-through mr-2">{v.used}</span>
                        <span className="text-sm font-bold text-purple-900">→ {v.suggested}</span>
                      </div>
                      <span className="text-xs text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">
                        {v.context}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Great vocabulary! No basic word substitutions needed.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GRAMMAR DIFFS */}
          {activeTab === 'grammar' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-4">
                Corrected grammar diffs from your transcript to achieve Band 7.0+ Grammatical Accuracy:
              </p>
              {score.grammar_corrections?.length > 0 ? (
                <div className="space-y-3">
                  {score.grammar_corrections.map((g, i) => (
                    <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                      <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg">
                        <span className="font-bold shrink-0">Original:</span>
                        <span className="line-through">{g.original}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                        <span className="font-bold shrink-0">Corrected:</span>
                        <span>{g.corrected}</span>
                      </div>
                      {g.explanation && (
                        <p className="text-[11px] text-gray-500 italic mt-1">{g.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No major grammatical errors detected in spoken answers!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};