// frontend/src/components/speaking/AudioRecorder.jsx
import React, { useState, useRef } from 'react';
import { Button } from '../common/Button';
import { Mic, Square, Timer } from 'lucide-react';

export const AudioRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0);
  const mediaRef = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRef.current = new MediaRecorder(stream);
    chunks.current = [];

    mediaRef.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRef.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/wav' });
      onRecordingComplete(blob);
    };

    mediaRef.current.start();
    setIsRecording(true);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  };

  const stop = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    setIsRecording(false);
    setTime(0);
  };

  const format = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="card text-center">
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
        isRecording ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
      }`}>
        {isRecording && <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />}
        {isRecording ? `Recording ${format(time)}` : 'Ready to record'}
      </div>

      {!isRecording ? (
        <Button variant="danger" size="lg" onClick={start}>
          <Mic className="h-5 w-5" />
          Start Recording
        </Button>
      ) : (
        <Button variant="secondary" size="lg" onClick={stop}>
          <Square className="h-5 w-5" />
          Stop Recording
        </Button>
      )}
    </div>
  );
};