// frontend/src/components/listening/AudioPlayer.jsx
import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, RotateCcw, RotateCw, Gauge } from 'lucide-react';

export const AudioPlayer = ({ audioUrl, onEnded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setCurrentTime(current);
    setDuration(dur);
    setProgress((current / dur) * 100);
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const skipTime = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Play / Pause / Skip Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => skipTime(-5)}
            className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-md text-white"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={() => skipTime(5)}
            className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5 font-mono">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
              {isPlaying ? 'Audio Playing...' : 'Click Play to start recording'}
            </span>
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <Gauge className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                playbackRate === rate ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setIsPlaying(false); onEnded && onEnded(); }}
        className="hidden"
      />
    </div>
  );
};