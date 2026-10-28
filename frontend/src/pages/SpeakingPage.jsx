// frontend/src/pages/SpeakingPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSpeaking } from '../hooks/useSpeaking';
import { Avatar, EXAMINERS } from '../components/speaking/Avatar';
import { ChatBubble } from '../components/speaking/ChatBubble';
import { AudioVisualizer } from '../components/speaking/AudioVisualizer';
import { RecordingControls } from '../components/speaking/RecordingControls';
import { PartSelector } from '../components/speaking/PartSelector';
import { TopicSelector } from '../components/speaking/TopicSelector';
import { ScoreDisplay } from '../components/speaking/ScoreDisplay';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Mic, RotateCcw, Send, Volume2, VolumeX, Clock, AlertCircle, Edit2 } from 'lucide-react';

const SPEAKING_PARTS = [
  { id: 1, name: 'Introduction & Interview', duration: 240, description: 'General questions on your selected topic' },
  { id: 2, name: 'Long Turn (Cue Card)', duration: 180, description: 'Speak for 1-2 minutes with 1 min note prep' },
  { id: 3, name: 'Two-Way Discussion', duration: 300, description: 'Deep interactive debate on abstract ideas' },
];

const PART2_PREP_SECONDS = 60;

export const SpeakingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Setup state
  const [step, setStep] = useState('setup'); // setup, practice, results
  const [selectedPart, setSelectedPart] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState('technology');
  const [customTopic, setCustomTopic] = useState('');
  const [examinerId, setExaminerId] = useState('david');

  // Practice state
  const [question, setQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isPrepping, setIsPrepping] = useState(false);
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);
  const [prepNotes, setPrepNotes] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [notice, setNotice] = useState(null);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const {
    fetchQuestion,
    startSession,
    uploadAndTranscribe,
    generateExaminerTurn,
    scoreSession,
    generateFallbackScore,
    loading,
    setLoading,
    error,
    setError,
  } = useSpeaking();

  const getActiveTopicName = () => {
    if (selectedTopic === 'custom') return customTopic.trim() || 'General IELTS Topic';
    return selectedTopic;
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load SpeechSynthesis voices on mount and cleanup on unmount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
        } catch (e) {
          console.warn('Cleanup speaking session error:', e);
        }
      }
    };
  }, []);

  // Select gender-matched human voice from browser voices
  const getExaminerVoice = (gender) => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const examinerInfo = EXAMINERS[gender] || EXAMINERS.david;
    const searchTerms = examinerInfo.voiceSearch || [];

    // Try finding matching voice by search terms
    for (const term of searchTerms) {
      const match = voices.find(v => v.name.toLowerCase().includes(term) || v.lang.toLowerCase().includes(term));
      if (match) return match;
    }

    // Fallback gender heuristic
    if (gender === 'david') {
      const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('george'));
      if (maleVoice) return maleVoice;
    } else {
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('sarah'));
      if (femaleVoice) return femaleVoice;
    }

    // Default to first English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  const speakText = (text) => {
    if (isMuted) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = getExaminerVoice(examinerId);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = 0.92;
      utterance.pitch = examinerId === 'sarah' ? 1.15 : 0.88;
      utterance.lang = 'en-US';

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const previewVoice = (selectedExaminerId) => {
    setExaminerId(selectedExaminerId);
    const examinerName = EXAMINERS[selectedExaminerId]?.name || 'Examiner';
    const sampleText = selectedExaminerId === 'david'
      ? `Hello! I'm ${examinerName}. I will be your IELTS speaking examiner today.`
      : `Good day! I'm ${examinerName}. Welcome to your IELTS speaking practice test.`;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      const voice = getExaminerVoice(selectedExaminerId);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = selectedExaminerId === 'sarah' ? 1.15 : 0.88;
      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Prep countdown (Part 2 only)
  useEffect(() => {
    let timer;
    if (step === 'practice' && isPrepping && prepTimeLeft > 0) {
      timer = setInterval(() => {
        setPrepTimeLeft(prev => {
          if (prev <= 1) {
            endPrep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, isPrepping, prepTimeLeft]);

  const endPrep = () => {
    setIsPrepping(false);
    setTimeLeft(SPEAKING_PARTS.find(p => p.id === selectedPart).duration);
  };

  // Timer for speaking part
  useEffect(() => {
    let timer;
    if (step === 'practice' && !isPrepping && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft, isPrepping]);

  const handleStartPractice = async () => {
    const activeTopic = getActiveTopicName();
    try {
      const q = await fetchQuestion(selectedPart, user?.target_band || 6.5, activeTopic);
      setQuestion(q);
      setPrepNotes('');
      setNotice(null);

      if (selectedPart === 2) {
        setIsPrepping(true);
        setPrepTimeLeft(PART2_PREP_SECONDS);
        setTimeLeft(0);
      } else {
        setIsPrepping(false);
        setTimeLeft(SPEAKING_PARTS.find(p => p.id === selectedPart).duration);
      }

      if (!String(q.id).startsWith('fallback-')) {
        try {
          const session = await startSession(q.id, user?.id || '00000000-0000-0000-0000-000000000001');
          setSessionId(session.id);
        } catch (err) {
          console.warn('Failed to start session, using client evaluation mode:', err.message);
          setSessionId(null);
        }
      } else {
        setSessionId(null);
      }

      const openingMessage = getOpeningMessage(selectedPart, q, activeTopic);
      setMessages([
        { role: 'ai', text: openingMessage, type: 'greeting' }
      ]);
      setStep('practice');

      speakText(openingMessage);
    } catch (err) {
      console.error('Failed to start practice:', err);
    }
  };

  const getOpeningMessage = (part, q, topicName) => {
    const examinerName = EXAMINERS[examinerId]?.name || 'Examiner';
    switch(part) {
      case 1:
        return `Good morning. My name is ${examinerName}. In this first part of the test, I'd like to ask you some questions about ${topicName}. ${q.question_text}`;
      case 2:
        return `Now, I'd like you to speak for one to two minutes on this topic about ${topicName}. Here is your task card: ${q.question_text}`;
      case 3:
        return `We've been talking about ${topicName}, and I'd like to discuss with you one or two more general questions related to this. ${q.question_text}`;
      default:
        return q.question_text;
    }
  };

  const startRecording = async () => {
    setNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        handleTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setNotice('Microphone access denied. You can type your spoken answer below to test.');
      setShowTextInput(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleTranscription = async (blob) => {
    let text;

    if (!sessionId) {
      // Offline mode: transcription runs on the backend, so a recording can't
      // be used - say so instead of the misleading "no speech detected".
      setNotice("Voice transcription is unavailable in offline mode. Please type your answer instead.");
      setShowTextInput(true);
      return;
    }

    try {
      text = await uploadAndTranscribe(sessionId, blob);
    } catch (err) {
      console.warn('Backend STT failed:', err.message);
      text = "";
    }

    // Silence / Empty Audio Detection
    if (!text || text.trim().length < 3) {
      setNotice("⚠️ No speech detected in your recording. Please speak clearly into your microphone and try again.");
      return;
    }

    processUserResponse(text);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    processUserResponse(textInput.trim());
    setTextInput('');
  };

  const processUserResponse = (responseText) => {
    setNotice(null);
    setTranscript(prev => (prev ? `${prev} | ${responseText}` : responseText));

    const updatedMessages = [...messages, { role: 'user', text: responseText, type: 'response' }];
    setMessages(updatedMessages);

    // Dynamic Real-time Examiner Reply
    handleAiResponse(responseText, updatedMessages);
  };

  const handleAiResponse = async (userTranscript, currentDialogueHistory) => {
    setIsAiSpeaking(true);
    const activeTopic = getActiveTopicName();

    try {
      const replyData = await generateExaminerTurn(
        sessionId,
        selectedPart,
        activeTopic,
        question?.question_text || "",
        currentDialogueHistory,
        userTranscript
      );

      const examinerReply = replyData.examiner_reply || "That's a very clear answer. Could you elaborate further on how this impacts daily life?";

      setMessages(prev => [...prev, { role: 'ai', text: examinerReply, type: 'followup' }]);
      speakText(examinerReply);
    } catch (e) {
      console.error('Failed to get interactive examiner turn:', e);
      const fallbackReply = `Thank you. Regarding ${activeTopic}, how do you see this evolving over the next few years?`;
      setMessages(prev => [...prev, { role: 'ai', text: fallbackReply, type: 'followup' }]);
      speakText(fallbackReply);
    }
  };

  const handleTimeUp = () => {
    stopRecording();
    setMessages(prev => [...prev, {
      role: 'ai',
      text: "Thank you, that concludes this part of the speaking test. Let me calculate your detailed score.",
      type: 'closing'
    }]);

    setTimeout(() => {
      calculateScore();
    }, 1800);
  };

  const calculateScore = async () => {
    setLoading(true);
    setError(null);
    try {
      // No backend session (offline mode): only a client-side estimate is
      // possible, and it's flagged is_estimate so the results screen says so.
      const result = sessionId
        ? await scoreSession(sessionId, messages, transcript)
        : generateFallbackScore(messages, question?.question_text || "", getActiveTopicName());
      setScore(result);
      setStep('results');
    } catch (err) {
      // Don't substitute a fabricated score for a failed AI evaluation - keep
      // the student on the practice screen with their answers so they can retry.
      console.error('Scoring failed:', err);
      setNotice(`AI scoring failed: ${err.message}. Your answers are kept - press "Finish & Get Detailed Evaluation" to try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = () => {
    stopRecording();
    calculateScore();
  };

  const reset = () => {
    setStep('setup');
    setMessages([]);
    setTranscript('');
    setScore(null);
    setSessionId(null);
    setIsRecording(false);
    setIsAiSpeaking(false);
    setIsPrepping(false);
    setPrepTimeLeft(0);
    setPrepNotes('');
    setNotice(null);
    setTextInput('');
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                IELTS AI Speaking Practice
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  Real Human Examiner & Live Voice
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                Part {selectedPart} • Topic: <span className="font-semibold text-indigo-600 capitalize">{getActiveTopicName()}</span>
              </p>
            </div>
          </div>

          {step === 'practice' && (
            <div className="flex items-center gap-4">
              {isPrepping ? (
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  <span className="font-mono font-bold text-sm text-amber-700">
                    Note Prep: {formatTime(prepTimeLeft)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl">
                  <Clock className={`w-4 h-4 ${timeLeft < 15 ? 'text-rose-600 animate-pulse' : 'text-gray-600'}`} />
                  <span className={`font-mono font-bold text-sm ${timeLeft < 15 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                title={isMuted ? 'Unmute Examiner' : 'Mute Examiner'}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-gray-600" />}
              </button>
              <button
                onClick={reset}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                title="Restart Session"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* STEP 1: SETUP SCREEN */}
        {step === 'setup' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Configure Your IELTS Speaking Session
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select your practice topic, test part, and official human examiner avatar.
                </p>
              </div>

              {/* Topic Selector */}
              <TopicSelector
                selectedTopic={selectedTopic}
                customTopic={customTopic}
                onTopicChange={setSelectedTopic}
                onCustomTopicChange={setCustomTopic}
              />

              {/* Part Selector */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 block">
                  Select IELTS Speaking Part
                </label>
                <div className="space-y-3">
                  {SPEAKING_PARTS.map(part => (
                    <PartSelector
                      key={part.id}
                      part={part}
                      isSelected={selectedPart === part.id}
                      onSelect={() => setSelectedPart(part.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Examiner Avatar Selector with Voice Preview Button */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900">
                    Select Your Photorealistic Examiner
                  </label>
                  <span className="text-xs text-gray-500 font-medium">Distinct Male & Female Voices</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Male Examiner David */}
                  <div
                    onClick={() => setExaminerId('david')}
                    className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                      examinerId === 'david' ? 'border-indigo-600 bg-indigo-50/70 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src="/examiner_david.png" alt="Examiner David" className="w-14 h-14 rounded-full object-cover border-2 border-indigo-600 shadow-sm" />
                      <div>
                        <p className="font-bold text-sm text-gray-900">Examiner David</p>
                        <p className="text-xs text-gray-500">British Male Voice • Senior Examiner</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); previewVoice('david'); }}
                      className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-100/80 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Test Male Voice
                    </button>
                  </div>

                  {/* Female Examiner Sarah */}
                  <div
                    onClick={() => setExaminerId('sarah')}
                    className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                      examinerId === 'sarah' ? 'border-purple-600 bg-purple-50/70 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src="/examiner_sarah.png" alt="Examiner Sarah" className="w-14 h-14 rounded-full object-cover border-2 border-purple-600 shadow-sm" />
                      <div>
                        <p className="font-bold text-sm text-gray-900">Examiner Sarah</p>
                        <p className="text-xs text-gray-500">Female Voice • Certified Assessor</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); previewVoice('sarah'); }}
                      className="mt-3 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100/80 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Test Female Voice
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartPractice}
                disabled={loading || (selectedTopic === 'custom' && !customTopic.trim())}
                className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl font-bold text-base hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Practice Test
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PRACTICE SCREEN */}
        {step === 'practice' && question && (
          <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* Left Column: Photorealistic Human Examiner Stage */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full flex flex-col items-center justify-between">
                <Avatar
                  isSpeaking={isAiSpeaking}
                  isListening={isRecording}
                  examinerId={examinerId}
                  onExaminerChange={setExaminerId}
                />

                <div className="w-full mt-4">
                  <AudioVisualizer isActive={isRecording || isAiSpeaking} />
                </div>

                <div className="w-full mt-4 p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-left">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Practice Topic</span>
                  <p className="text-xs font-bold text-indigo-950 mt-0.5 capitalize">{getActiveTopicName()}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Chat & Speech Input */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                
                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, index) => (
                    <ChatBubble
                      key={index}
                      role={msg.role}
                      text={msg.text}
                      type={msg.type}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Silence / Alert Notice Banner */}
                {notice && (
                  <div className="mx-6 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="flex-1 font-medium">{notice}</span>
                    <button
                      onClick={() => setNotice(null)}
                      className="text-amber-600 font-bold hover:text-amber-900 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Part 2 Prep Box */}
                {isPrepping && (
                  <div className="border-t border-amber-200 p-4 bg-amber-50/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        1-Minute Silent Prep Time ({Math.floor(prepTimeLeft / 60)}:{(prepTimeLeft % 60).toString().padStart(2, '0')})
                      </span>
                      <button
                        onClick={endPrep}
                        className="text-xs font-semibold text-amber-700 underline hover:text-amber-900"
                      >
                        Start Speaking Now →
                      </button>
                    </div>
                    <textarea
                      value={prepNotes}
                      onChange={(e) => setPrepNotes(e.target.value)}
                      placeholder="Jot down key points and vocabulary for your talk..."
                      className="w-full h-20 px-3 py-2 text-xs border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none resize-none bg-white"
                    />
                  </div>
                )}

                {/* Recording Controls & Text Fallback Toggle */}
                <div className="border-t border-gray-200 p-4 bg-gray-50/50 space-y-3">
                  {showTextInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        placeholder="Type your spoken answer here..."
                        className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim()}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => setShowTextInput(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 underline px-2"
                      >
                        Use Mic 🎙️
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <RecordingControls
                        isRecording={isRecording}
                        onStart={startRecording}
                        onStop={stopRecording}
                        disabled={isAiSpeaking || isPrepping}
                      />

                      <button
                        onClick={handleSubmitManual}
                        disabled={messages.filter(m => m.role === 'user').length === 0 || loading || isPrepping}
                        className="flex-1 bg-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {loading ? <LoadingSpinner size="sm" /> : (
                          <>
                            <Send className="w-4 h-4" />
                            Finish & Get Detailed Evaluation
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowTextInput(true)}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Type answer instead of recording"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  )}

                  {isRecording && (
                    <p className="text-center text-xs font-semibold text-rose-600 animate-pulse">
                      🎙️ Recording... Speak clearly into your microphone
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS SCREEN */}
        {step === 'results' && score && (
          <div className="max-w-4xl mx-auto space-y-6">
            {score.is_estimate && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-sm text-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>Offline estimate.</strong> The AI examiner was unavailable, so this band is a rough
                  estimate from word count and vocabulary variety only - it isn't an AI evaluation and isn't
                  saved to your progress.
                </span>
              </div>
            )}
            <ScoreDisplay score={score} />

            <div className="flex gap-4 pt-4">
              <button
                onClick={reset}
                className="flex-1 bg-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                Practice Another Topic
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-white text-gray-700 border border-gray-200 py-3.5 px-6 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};