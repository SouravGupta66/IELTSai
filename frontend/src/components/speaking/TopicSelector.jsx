// frontend/src/components/speaking/TopicSelector.jsx
import React from 'react';
import { Laptop, Briefcase, GraduationCap, Leaf, Sparkles, Globe, HeartPulse, Users, Building, Edit3 } from 'lucide-react';

const TOPICS = [
  { id: 'technology', label: 'Technology & AI', icon: Laptop, desc: 'Gadgets, AI, digital life' },
  { id: 'work', label: 'Work & Careers', icon: Briefcase, desc: 'Jobs, workplace, career goals' },
  { id: 'education', label: 'Education & Learning', icon: GraduationCap, desc: 'Schools, online study, skills' },
  { id: 'environment', label: 'Environment & Nature', icon: Leaf, desc: 'Climate, pollution, green energy' },
  { id: 'hobbies', label: 'Hobbies & Leisure', icon: Sparkles, desc: 'Free time, music, arts, gaming' },
  { id: 'travel', label: 'Travel & Culture', icon: Globe, desc: 'Tourism, countries, cultural heritage' },
  { id: 'health', label: 'Health & Sports', icon: HeartPulse, desc: 'Fitness, nutrition, mental wellness' },
  { id: 'family', label: 'Family & Relationships', icon: Users, desc: 'Friends, family structure, community' },
  { id: 'cities', label: 'Cities & Architecture', icon: Building, desc: 'Hometowns, urban living, housing' },
  { id: 'custom', label: 'Custom Topic...', icon: Edit3, desc: 'Specify any custom practice topic' },
];

export const TopicSelector = ({ selectedTopic, customTopic, onTopicChange, onCustomTopicChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          Select Practice Topic
        </label>
        <span className="text-xs text-gray-500">Pick a topic to tailor examiner questions</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          const isSelected = selectedTopic === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onTopicChange(topic.id)}
              className={`
                p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-24
                ${isSelected
                  ? 'border-indigo-600 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/60 bg-white'
                }
              `}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                )}
              </div>
              <div>
                <p className={`text-xs font-semibold ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {topic.label}
                </p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{topic.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTopic === 'custom' && (
        <div className="mt-3 p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 animate-fadeIn">
          <label className="block text-xs font-semibold text-indigo-900">
            Type Your Custom Topic:
          </label>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => onCustomTopicChange(e.target.value)}
            placeholder="e.g. Artificial Intelligence in Healthcare, Traditional Cooking..."
            className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      )}
    </div>
  );
};
