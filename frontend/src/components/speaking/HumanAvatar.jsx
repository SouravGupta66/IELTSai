// frontend/src/components/speaking/HumanAvatar.jsx
import React, { useState, useEffect } from 'react';
import { Volume2, Mic, UserCheck } from 'lucide-react';

export const EXAMINERS = {
  david: {
    id: 'david',
    name: 'Examiner David',
    title: 'Senior IELTS Examiner (UK)',
    gender: 'male',
    accent: 'British / RP Accent',
    photo: '/examiner_david.png',
    voiceSearch: ['david', 'george', 'uk english male', 'daniel', 'male', 'en-gb'],
  },
  sarah: {
    id: 'sarah',
    name: 'Examiner Sarah',
    title: 'Certified IELTS Assessor (AU/US)',
    gender: 'female',
    accent: 'Australian / American Accent',
    photo: '/examiner_sarah.png',
    voiceSearch: ['zira', 'sarah', 'uk english female', 'karen', 'fiona', 'female', 'en-us', 'en-au'],
  }
};

export const HumanAvatar = ({
  isSpeaking = false,
  isListening = false,
  examinerId = 'david',
  onExaminerChange
}) => {
  const examiner = EXAMINERS[examinerId] || EXAMINERS.david;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Examiner Switcher Header */}
      {onExaminerChange && (
        <div className="flex items-center justify-center gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl w-full max-w-xs shadow-inner">
          <button
            type="button"
            onClick={() => onExaminerChange('david')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              examinerId === 'david'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👨 Examiner David
          </button>
          <button
            type="button"
            onClick={() => onExaminerChange('sarah')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              examinerId === 'sarah'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👩 Examiner Sarah
          </button>
        </div>
      )}

      {/* Photorealistic Examiner Stage Frame */}
      <div className="relative w-full max-w-[290px] aspect-[4/5] rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl bg-slate-900 flex items-center justify-center">
        
        {/* Photorealistic Face Container */}
        <div className="relative w-full h-full">
          <img
            src={examiner.photo}
            alt={examiner.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isSpeaking ? 'scale-105' : 'scale-100'
            }`}
          />
        </div>

        {/* IELTS Official Examiner Badge Banner */}
        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 shadow-md border border-white/20 z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          OFFICIAL IELTS EXAMINER
        </div>

        {/* Speech Audio Sound Wave Ripple Rings */}
        {isSpeaking && (
          <div className="absolute inset-0 border-4 border-indigo-400/50 rounded-2xl animate-pulse pointer-events-none z-10" />
        )}
        {isListening && (
          <div className="absolute inset-0 border-4 border-rose-500/60 rounded-2xl animate-ping pointer-events-none z-10" />
        )}

        {/* Examiner Desk Trim Overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-3 pt-6 flex items-center justify-between text-[11px] font-semibold text-white z-10">
          <div>
            <p className="font-bold">{examiner.name}</p>
            <p className="text-[9px] text-slate-300 font-normal">{examiner.accent}</p>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
            {isSpeaking ? 'VOICE ACTIVE' : 'LIVE EXAMINER'}
          </span>
        </div>
      </div>

      {/* Voice Status Pill */}
      <div className="mt-3">
        <div className={`
          px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-sm
          ${isSpeaking ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse' :
            isListening ? 'bg-rose-100 text-rose-800 border border-rose-200' :
            'bg-slate-100 text-slate-700 border border-slate-200'}
        `}>
          {isSpeaking ? (
            <>
              <Volume2 className="w-4 h-4 animate-bounce text-indigo-600" />
              <span>{examiner.name} is speaking...</span>
            </>
          ) : isListening ? (
            <>
              <Mic className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Listening to your response...</span>
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span>Ready for candidate</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
