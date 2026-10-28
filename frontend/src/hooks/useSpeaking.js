// frontend/src/hooks/useSpeaking.js
import { useState } from 'react';

const API_URL = 'http://localhost:8000/api';

// ─── FALLBACK QUESTION GENERATOR ───
const generateFallbackQuestion = (part, band, requestedTopic) => {
  const topic = requestedTopic || 'technology';
  
  const part1Questions = [
    `Let's talk about ${topic}. What role does ${topic} play in your daily life and how often do you interact with it?`,
    `Do you think ${topic} has changed significantly in recent years in your country? How?`,
    `What are some popular aspects of ${topic} among people of your age group?`,
    `Would you like to learn or explore more about ${topic} in the future? Why?`
  ];
  
  const part2CueCards = [
    `Describe an important experience or project you had involving ${topic}.
    You should say:
    - what the experience or project was
    - when and where it took place
    - who you were with or who influenced you
    - and explain why this experience regarding ${topic} was significant to you.`
  ];
  
  const part3Questions = [
    `How do you think trends in ${topic} will evolve in the next decade globally?`,
    `Some experts suggest that modern developments in ${topic} create both opportunities and challenges. What is your perspective?`,
    `How does public policy or education influence society's attitude towards ${topic}?`
  ];
  
  const questions = {
    1: part1Questions,
    2: part2CueCards,
    3: part3Questions
  };
  
  const selectedQuestions = questions[part] || part1Questions;
  const questionText = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];
  
  return {
    id: `fallback-${Date.now()}`,
    part: part,
    topic: topic,
    band_seed: band,
    question_text: questionText,
    used_count: 0
  };
};

export const useSpeaking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchQuestion = async (part, band, topic = 'technology') => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    
    const params = `part=${part}&band=${band}&topic=${encodeURIComponent(topic)}`;

    try {
      const response = await fetch(`${API_URL}/speaking/question?${params}`);
      if (response.ok) return await response.json();

      // Nothing pre-generated for this part/topic/band - generate one live.
      // Slower (~15-30s) but returns a stored question, so a real session
      // (and with it backend transcription + AI scoring) can be started.
      if (response.status === 404) {
        const liveResponse = await fetch(`${API_URL}/speaking/question-live?${params}`, { method: 'POST' });
        if (liveResponse.ok) return await liveResponse.json();
        console.warn(`Live generation returned ${liveResponse.status}`);
      }

      console.warn(`No backend question available, generating fallback question for topic: ${topic}`);
      setUsingFallback(true);
      return generateFallbackQuestion(part, band, topic);
    } catch (err) {
      console.warn('Network error, using fallback question generator:', err.message);
      setUsingFallback(true);
      setError('Backend unavailable - using offline practice mode');
      return generateFallbackQuestion(part, band, topic);
    } finally {
      setLoading(false);
    }
  };

  // ─── REAL-TIME EXAMINER TURN GENERATION ───
  const generateExaminerTurn = async (sessionId, part, topic, currentQuestion, dialogueHistory, latestUserTranscript) => {
    if (sessionId) {
      try {
        const response = await fetch(`${API_URL}/speaking/examiner-turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part,
            topic,
            current_question: currentQuestion,
            dialogue_history: dialogueHistory,
            latest_user_transcript: latestUserTranscript
          })
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        console.warn('Examiner turn API error, falling back to local turn engine:', e);
      }
    }

    // Fallback Client-side Dynamic Examiner Reply Engine
    const topicKeywords = latestUserTranscript.toLowerCase();
    let followUp = "";

    if (topicKeywords.includes("think") || topicKeywords.includes("believe") || topicKeywords.includes("opinion")) {
      followUp = `That's a well-reasoned perspective on ${topic}. Could you elaborate on what specific factors influenced your opinion on this?`;
    } else if (topicKeywords.includes("because") || topicKeywords.includes("reason")) {
      followUp = `You mentioned key reasons regarding ${topic}. Do you think most people in your community share this view or hold a different perspective?`;
    } else if (topicKeywords.includes("future") || topicKeywords.includes("will") || topicKeywords.includes("change")) {
      followUp = `Looking ahead, how do you expect developments in ${topic} to impact younger generations in particular?`;
    } else {
      followUp = `Thank you for sharing that point. Could you give a practical example from your own life or country related to ${topic}?`;
    }

    return {
      examiner_reply: followUp,
      is_final_turn: false
    };
  };

  // ─── ADVANCED FALLBACK SCORE EVALUATOR ───
  const generateFallbackScore = (dialogueHistory, mainQuestion, topic) => {
    // Extract candidate responses from dialogue history
    const candidateTexts = dialogueHistory
      .filter(m => m.role === 'user')
      .map(m => m.text);
    
    const combinedText = candidateTexts.join(' ');
    const words = combinedText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    if (wordCount < 5) {
      return {
        id: `session-${Date.now()}`,
        is_estimate: true,
        band_score: 0.0,
        fluency_score: 0.0,
        vocab_score: 0.0,
        grammar_score: 0.0,
        pronunciation_score: 0.0,
        coherence_score: 0.0,
        feedback: `No spoken response was detected for the session on "${topic}". Please check your microphone and speak clearly during your practice session to receive a detailed band evaluation.`,
        fluency_feedback: "No speech detected (0 words spoken).",
        vocab_feedback: "No vocabulary produced.",
        grammar_feedback: "No grammatical sentence structures attempted.",
        pronunciation_feedback: "No speech audio or spoken words recorded.",
        strengths: [],
        weaknesses: ["No candidate speech recorded during the session"],
        grammar_corrections: [],
        vocabulary_upgrades: [],
        speech_metrics: {
          total_words: 0,
          filler_count: 0,
          lexical_diversity_percent: "0.0",
          wpm: 0
        },
        transcript: combinedText
      };
    }

    // Word count & WPM estimation
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const lexicalDiversity = words.length > 0 ? (uniqueWords.size / words.length) : 0;
    
    // Detect filler words (hesitations)
    const fillers = (combinedText.match(/\b(um|uh|like|you know|actually|basically|so|well)\b/gi) || []);
    const fillerCount = fillers.length;

    // Calculate Criterion Bands
    let fluencyBand = Math.min(6.0 + (wordCount / 60) - (fillerCount * 0.2), 8.5);
    fluencyBand = Math.max(5.0, Math.round(fluencyBand * 2) / 2);

    let vocabBand = Math.min(5.5 + (lexicalDiversity * 3.5), 8.5);
    vocabBand = Math.max(5.5, Math.round(vocabBand * 2) / 2);

    let grammarBand = 6.5;
    if (combinedText.includes("because") || combinedText.includes("although") || combinedText.includes("which") || combinedText.includes("however")) {
      grammarBand = 7.0;
    }

    let pronunciationBand = 6.5;
    let coherenceBand = Math.min(fluencyBand, 8.0);

    const overallBand = Math.round(((fluencyBand + vocabBand + grammarBand + pronunciationBand) / 4) * 2) / 2;

    // Generate intelligent feedback items
    const strengths = [];
    const weaknesses = [];
    const grammarCorrections = [];
    const vocabularyUpgrades = [];

    if (wordCount > 80) {
      strengths.push("Good volume of spoken response with extended answers.");
    } else {
      weaknesses.push("Responses were somewhat brief. Aim to expand with reasons and examples.");
    }

    if (lexicalDiversity > 0.55) {
      strengths.push("Wide vocabulary diversity with varied word choices.");
    } else {
      weaknesses.push("Repeated common words. Use more varied synonyms and collocations.");
    }

    if (fillerCount > 3) {
      weaknesses.push(`Detected ${fillerCount} filler hesitation words ('um', 'like', 'you know'). Try pausing silently instead.`);
    } else {
      strengths.push("Controlled pace with minimal hesitation markers.");
    }

    // Sample Grammar & Vocabulary Suggestions based on text analysis
    if (combinedText.toLowerCase().includes("good thing")) {
      vocabularyUpgrades.push({
        used: "good thing",
        suggested: "beneficial aspect / significant advantage",
        context: "Higher band academic vocabulary"
      });
    }
    if (combinedText.toLowerCase().includes("a lot of")) {
      vocabularyUpgrades.push({
        used: "a lot of",
        suggested: "a substantial number of / a plethora of",
        context: "Replaces informal quantifier"
      });
    }

    // Add default vocabulary upgrade if empty
    if (vocabularyUpgrades.length === 0) {
      vocabularyUpgrades.push({
        used: "important",
        suggested: "crucial / paramount / indispensable",
        context: "Elevates band score in Lexical Resource"
      });
    }

    return {
      id: `session-${Date.now()}`,
      is_estimate: true,
      band_score: overallBand,
      fluency_score: fluencyBand,
      vocab_score: vocabBand,
      grammar_score: grammarBand,
      pronunciation_score: pronunciationBand,
      coherence_score: coherenceBand,
      feedback: `Overall Band Score ${overallBand}. You demonstrated good communicative ability on the topic of "${topic}". ${wordCount > 80 ? 'Your answers were well-developed.' : 'Focus on expanding your points with secondary explanations and real-world examples.'}`,
      fluency_feedback: `Fluency Band ${fluencyBand}: Good flow with ${fillerCount} hesitation markers detected across ${wordCount} total words.`,
      vocab_feedback: `Vocabulary Band ${vocabBand}: Lexical diversity ratio is ${(lexicalDiversity * 100).toFixed(1)}%.`,
      grammar_feedback: `Grammar Band ${grammarBand}: Demonstrated functional sentence structures with basic complex clauses.`,
      pronunciation_feedback: `Pronunciation Band ${pronunciationBand}: Clear intelligibility and natural cadence.`,
      strengths,
      weaknesses,
      grammar_corrections: grammarCorrections,
      vocabulary_upgrades: vocabularyUpgrades,
      speech_metrics: {
        total_words: wordCount,
        filler_count: fillerCount,
        lexical_diversity_percent: (lexicalDiversity * 100).toFixed(1),
        wpm: Math.round(wordCount / 1.5)
      },
      transcript: combinedText
    };
  };

  // ─── REAL BACKEND SESSION FLOW ───

  const startSession = async (questionId, userId) => {
    const params = new URLSearchParams({ question_id: questionId, user_id: userId });
    const response = await fetch(`${API_URL}/speaking/start-session?${params}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to start speaking session');
    return await response.json();
  };

  const uploadAndTranscribe = async (sessionId, audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const uploadRes = await fetch(`${API_URL}/speaking/upload-audio/${sessionId}`, {
      method: 'POST',
      body: formData,
    });
    if (!uploadRes.ok) throw new Error('Failed to upload audio');

    const transcribeRes = await fetch(`${API_URL}/speaking/transcribe/${sessionId}`, { method: 'POST' });
    if (!transcribeRes.ok) {
      const body = await transcribeRes.json().catch(() => null);
      throw new Error(body?.detail || 'Failed to transcribe audio');
    }
    const { transcript } = await transcribeRes.json();
    return transcript;
  };

  const scoreSession = async (sessionId, dialogueHistory, transcript) => {
    const response = await fetch(`${API_URL}/speaking/score/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        dialogue_history: dialogueHistory
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || 'Failed to score speaking session');
    }
    const scores = await response.json();
    return {
      id: sessionId,
      band_score: scores.band_score,
      fluency_score: scores.fluency,
      vocab_score: scores.vocabulary,
      grammar_score: scores.grammar,
      pronunciation_score: scores.pronunciation,
      coherence_score: scores.coherence,
      feedback: scores.feedback,
      fluency_feedback: scores.fluency_feedback,
      vocab_feedback: scores.vocab_feedback,
      grammar_feedback: scores.grammar_feedback,
      pronunciation_feedback: scores.pronunciation_feedback,
      strengths: scores.strengths || [],
      weaknesses: scores.weaknesses || [],
      grammar_corrections: scores.grammar_corrections || [],
      vocabulary_upgrades: scores.vocabulary_upgrades || [],
      speech_metrics: scores.speech_metrics
    };
  };

  return {
    fetchQuestion,
    startSession,
    uploadAndTranscribe,
    scoreSession,
    generateExaminerTurn,
    generateFallbackScore,
    loading,
    setLoading,
    error,
    setError,
    usingFallback,
  };
};