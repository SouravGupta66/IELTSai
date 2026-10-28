# backend/app/services/ollama_service.py
# All AI communication happens through this file

import re
import requests
import json
import os
from typing import Optional, Dict, Any

from ..config import load_env

load_env()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct")

class OllamaService:
    """
    Service class to communicate with Ollama locally.
    Industry pattern: Single responsibility - only handles AI calls.
    """
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.generate_url = f"{self.base_url}/api/generate"
        self.chat_url = f"{self.base_url}/api/chat"
    
    def _call_ollama(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        timeout: int = 120,
        num_predict: int = 2000,
        temperature: float = 0.7,
    ) -> str:
        """
        Private method: Core communication with Ollama
        Industry pattern: Private methods start with _
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,  # We want full response at once
            "options": {
                "temperature": temperature,  # Creativity level (0.0 = strict, 1.0 = creative)
                "num_predict": num_predict   # Max tokens to generate
            }
        }

        # Add system prompt if provided (for better control)
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(
                self.generate_url,
                json=payload,
                timeout=timeout
            )
            response.raise_for_status()  # Raise error if bad status
            return response.json().get("response", "")
            
        except requests.exceptions.ConnectionError:
            raise Exception("❌ Ollama is not running! Start it with: ollama serve")
        except requests.exceptions.Timeout:
            raise Exception("❌ Ollama request timed out. Model may be too slow.")
        except Exception as e:
            raise Exception(f"❌ Ollama error: {str(e)}")
    
    # ═══════════════════════════════════════════
    # SPEAKING MODULE METHODS
    # ═══════════════════════════════════════════
    
    def generate_speaking_question(self, part: int, topic: str, band: float) -> Dict[str, Any]:
        """
        Generates IELTS speaking question using Qwen 3B.

        Part 2 gets a distinct cue-card format (topic + "You should say:" bullet
        points) matching the real exam's task card, rather than a plain question -
        Parts 1 and 3 use a single interview-style question/discussion prompt.
        """
        if part == 2:
            return self._generate_speaking_cue_card(topic, band)

        system_prompt = """You are an IELTS examiner. Generate natural, spoken English questions.
        Follow IELTS format exactly. Output valid JSON only."""

        prompt = f"""
        Generate an IELTS Speaking Part {part} question about "{topic}" for band {band} candidate.

        Requirements:
        - Part {part} style ({"introduction/interview" if part == 1 else "two-way discussion"})
        - Natural spoken English
        - Appropriate difficulty for band {band}
        - Only output JSON in this format:

        {{
            "question_text": "the actual question",
            "suggested_time_seconds": 120,
            "follow_up_questions": ["q1", "q2"]  // Only for Part 3
        }}
        """

        response = self._call_ollama(prompt, system_prompt)

        # Parse JSON from response (Qwen might add extra text)
        try:
            # Find JSON in response (sometimes model adds explanations)
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            return json.loads(response)
        except json.JSONDecodeError:
            # Fallback: return raw text wrapped in JSON
            return {
                "question_text": response.strip(),
                "suggested_time_seconds": 120,
                "follow_up_questions": []
            }

    def _generate_speaking_cue_card(self, topic: str, band: float) -> Dict[str, Any]:
        """
        Generates a real IELTS Part 2 cue card: a "Describe a/an ..." prompt plus
        3-4 "you should say" bullet points, matching the real exam's task card
        format instead of a single plain question.
        """
        system_prompt = """You are an IELTS examiner writing Part 2 cue cards.
        Follow the real IELTS cue card format exactly. Output valid JSON only."""

        prompt = f"""
        Generate an IELTS Speaking Part 2 cue card. The topic MUST be about "{topic}",
        for a band {band} candidate.

        Real IELTS Part 2 cue cards follow this exact pattern:
        - A "Describe a ..."/"Describe an ..." topic sentence, about "{topic}" specifically
        - Use whichever article (a/an) is grammatically correct for the actual noun
        - Exactly 3-4 bullet points guiding what to cover (do NOT include a
          "you should say" bullet itself - that heading is added separately)
        - The last bullet should ask the candidate to explain/reflect on something

        Here is one example for a DIFFERENT topic ("a holiday"), showing the
        format only - do not reuse this topic, generate one about "{topic}" instead:
        {{
            "question_text": "Describe a holiday you went on.",
            "cue_points": ["where you went and when", "who you went with", "what you did there", "and explain why this holiday was memorable"],
            "suggested_time_seconds": 120
        }}

        Now output JSON in that same format, but about "{topic}".
        """

        response = self._call_ollama(prompt, system_prompt)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(response[json_start:json_end])
            else:
                result = json.loads(response)
        except json.JSONDecodeError:
            return {
                "question_text": response.strip(),
                "cue_points": [],
                "suggested_time_seconds": 120,
                "follow_up_questions": []
            }

        result.setdefault("cue_points", [])
        result.setdefault("follow_up_questions", [])
        # Defensive filter: strip a redundant "you should say" bullet if the
        # model includes one despite the instruction not to.
        result["cue_points"] = [
            p for p in result["cue_points"]
            if p.strip().lower() not in ("you should say", "you should say:")
        ]
        return result
    
    def validate_speaking_question(self, question: str, part: int, band: float) -> Dict[str, Any]:
        """
        Validates question quality with cheap rule-based checks instead of an LLM call.

        An LLM-based validator was tried here (same pattern as Qwen 7B originally),
        but on this 3B model it unreliably rejected genuinely standard IELTS
        questions on style/open-endedness grounds regardless of prompting - net
        negative, since it doubled generation time while blocking good content.
        Rule-based checks are cheap, reliable, and catch the failure modes that
        actually happen in practice (empty/truncated output, non-question text).
        """
        text = (question or "").strip()
        issues = []

        if len(text) < 15:
            issues.append("Question is too short.")
        # Part 2 cue cards are a "Describe a/an ..." statement, not a question
        # ending in "?" - only Parts 1/3 are actual interview-style questions.
        if part != 2 and "?" not in text:
            issues.append("Doesn't look like a question (no '?').")
        if len(text) > 500:
            issues.append("Question is unreasonably long.")

        return {
            "is_valid": len(issues) == 0,
            "score": 8 if not issues else 3,
            "issues": issues,
            "improved_version": text,
        }
    
    def generate_examiner_turn(
        self,
        part: int,
        topic: str,
        current_question: str,
        dialogue_history: list,
        latest_user_transcript: str
    ) -> Dict[str, Any]:
        """
        Generates a dynamic real-time examiner follow-up turn in response to student's answer.
        """
        system_prompt = """You are a professional, friendly, and realistic IELTS Speaking examiner.
        Your goal is to conduct a natural, real-time IELTS speaking interview.
        Acknowledge the candidate's last answer naturally, then ask a relevant follow-up question or probe deeper.
        Keep your response natural, spoken-style, and 2-3 sentences long.
        Do NOT output long monologues. Output JSON only."""

        history_str = "\n".join([f"{m.get('role', 'user').upper()}: {m.get('text', '')}" for m in dialogue_history[-6:]])

        prompt = f"""
        IELTS Speaking Part {part} interview about topic "{topic}".
        Initial question: {current_question}
        
        Recent dialogue history:
        {history_str}
        
        Candidate just said: "{latest_user_transcript}"
        
        As the IELTS examiner:
        1. Give a brief, natural 1-sentence examiner reaction to what candidate said.
        2. Ask a relevant, engaging follow-up question related to "{topic}" and their points.
        
        Output JSON format:
        {{
            "examiner_reply": "Brief reaction and follow-up question text here",
            "is_final_turn": false
        }}
        """

        try:
            response = self._call_ollama(prompt, system_prompt, timeout=90, temperature=0.7)
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(response[json_start:json_end])
            return json.loads(response)
        except Exception:
            # Fallback dynamic reaction if Ollama call fails/times out
            return {
                "examiner_reply": f"That's a very clear point regarding {topic}. Could you share an example from your own experience or explain why that is important to you?",
                "is_final_turn": False
            }

    def _check_speaking_relevance(self, spoken_text: str, question: str) -> bool:
        """
        Speaking counterpart of _check_essay_relevance: a separate binary check
        so an off-topic answer gets its Coherence/band capped by the caller,
        instead of trusting the main scoring call to reflect relevance in its
        numbers. Fails open (treated as relevant) if Ollama errors, so a flaky
        check never penalises a genuine answer.
        """
        system_prompt = "You are an IELTS examiner checking only whether a candidate's spoken answers address the examiner's questions."
        check_prompt = f"""
        IELTS Speaking question: {question}

        Interview transcript: {spoken_text[:1500]}

        Do the candidate's answers genuinely attempt to address the examiner's
        questions, even partially? Answer with exactly one word: YES or NO.
        """
        try:
            response = self._call_ollama(check_prompt, system_prompt, timeout=90, num_predict=10, temperature=0.1)
        except Exception:
            return True
        return "NO" not in response.strip().upper()[:10]

    def score_speaking_answer(self, transcript: str, question: str, part: int, dialogue_history: list = None) -> Dict[str, Any]:
        """
        Scores speaking transcript / full dialogue history using official IELTS criteria.
        """
        # Extract candidate text
        user_text = transcript or ""
        if dialogue_history and len(dialogue_history) > 0:
            user_messages = [m.get('text', '') for m in dialogue_history if m.get('role') == 'user']
            if user_messages:
                user_text = " ".join(user_messages)

        candidate_words = [w for w in user_text.split() if w.strip()]
        if len(candidate_words) < 5:
            return {
                "band_score": 0.0,
                "fluency": 0.0,
                "vocabulary": 0.0,
                "grammar": 0.0,
                "pronunciation": 0.0,
                "coherence": 0.0,
                "feedback": "No spoken candidate response was recorded for this test. Ensure your microphone is working and speak clearly during your practice session.",
                "fluency_feedback": f"Insufficient speech recorded ({len(candidate_words)} words spoken). Speak in full sentences to receive a fluency score.",
                "vocab_feedback": "No functional vocabulary produced.",
                "grammar_feedback": "No grammatical sentence structures attempted.",
                "pronunciation_feedback": "No speech audio or spoken words recorded for pronunciation analysis.",
                "strengths": [],
                "weaknesses": ["No spoken candidate response was recorded for this session"],
                "grammar_corrections": [],
                "vocabulary_upgrades": []
            }

        # If full dialogue history is provided, format it
        full_text = user_text
        if dialogue_history and len(dialogue_history) > 0:
            full_text = "\n".join([f"{m.get('role', 'user').upper()}: {m.get('text', '')}" for m in dialogue_history])

        is_relevant = self._check_speaking_relevance(full_text, question)

        system_prompt = """You are an expert official IELTS Speaking Examiner.
        Evaluate the candidate's spoken performance across all 4 criteria strictly:
        - Fluency & Coherence
        - Lexical Resource (Vocabulary)
        - Grammatical Range & Accuracy
        - Pronunciation (inferred from transcript structure & speech patterns)
        
        Output valid JSON only. Do NOT include markdown around JSON."""

        prompt = f"""
        Score this IELTS Speaking Part {part} candidate performance.
        
        Main Question/Topic: {question}
        Candidate Spoken Transcript:
        {full_text}
        
        Score each criterion from 0.0 to 9.0 in 0.5 increments.
        
        Return JSON in this EXACT structure:
        {{
            "band_score": 6.5,
            "fluency": 6.5,
            "vocabulary": 6.5,
            "grammar": 6.0,
            "pronunciation": 6.5,
            "coherence": 6.5,
            "feedback": "Comprehensive summary evaluation of candidate performance.",
            "fluency_feedback": "Detailed analysis of flow, hesitations, self-corrections.",
            "vocab_feedback": "Analysis of word choices, range, and accuracy.",
            "grammar_feedback": "Analysis of sentence structures, tenses, and errors.",
            "pronunciation_feedback": "Analysis of rhythm, stress, and articulation.",
            "strengths": ["Clear articulation of main points", "Good topical vocabulary"],
            "weaknesses": ["Frequent reliance on basic fillers like 'um'", "Some subject-verb agreement errors"],
            "grammar_corrections": [
                {{
                    "original": "I have went there last year",
                    "corrected": "I went there last year",
                    "explanation": "Use simple past tense for specified past time."
                }}
            ],
            "vocabulary_upgrades": [
                {{
                    "used": "good thing",
                    "suggested": "beneficial aspect / valuable asset",
                    "context": "Enhances precision and band score."
                }}
            ]
        }}
        """

        response = self._call_ollama(prompt, system_prompt, timeout=240, temperature=0.3)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0:
                result = json.loads(response[json_start:json_end])
            else:
                result = json.loads(response)
        except (json.JSONDecodeError, ValueError):
            word_count = len(candidate_words)
            calc_band = min(8.5, max(4.0, round((4.0 + (word_count / 40.0)) * 2) / 2))
            result = {
                "band_score": calc_band,
                "fluency": calc_band, "vocabulary": calc_band, "grammar": calc_band,
                "pronunciation": calc_band, "coherence": calc_band,
                "feedback": f"Spoke {word_count} words during session. Demonstrated good communicative effort.",
                "fluency_feedback": "Spoke with understandable rhythm.",
                "vocab_feedback": "Used topic-related vocabulary.",
                "grammar_feedback": "Basic functional sentence structures.",
                "pronunciation_feedback": "Intelligible speech pattern.",
                "strengths": ["Communicated core ideas"],
                "weaknesses": ["Continue extending complex sentence clauses"],
                "grammar_corrections": [],
                "vocabulary_upgrades": []
            }

        if not is_relevant:
            result["coherence"] = min(float(result.get("coherence", 3.0)), 3.0)
            result["band_score"] = min(float(result.get("band_score", 3.5)), 4.0)
            off_topic_note = "This response did not directly address the examiner's question, which caps the Coherence band. "
            result["feedback"] = off_topic_note + result.get("feedback", "")

        return result
    
    # ═══════════════════════════════════════════
    # WRITING MODULE METHODS
    # ═══════════════════════════════════════════
    
    def generate_writing_prompt(self, task_type: int, topic: str, band: float) -> Dict[str, Any]:
        """
        Generates IELTS Writing Task 1 or 2 prompt
        """
        system_prompt = "You are an IELTS prompt writer. Generate clear, exam-style prompts."
        
        if task_type == 1:
            prompt = f"""
            Generate IELTS Writing Task 1 (Academic) about "{topic}" for band {band}.
            Describe a chart/graph/table. Output JSON:
            {{
                "prompt_text": "description of the visual data",
                "chart_type": "line/bar/pie/table",
                "key_features": ["feature1", "feature2"],
                "word_count_suggested": 150
            }}
            """
        else:
            prompt = f"""
            Generate IELTS Writing Task 2 essay question about "{topic}" for band {band}.
            Output JSON:
            {{
                "prompt_text": "essay question",
                "essay_type": "opinion/discussion/problem-solution",
                "word_count_suggested": 250
            }}
            """
        
        response = self._call_ollama(prompt, system_prompt)
        
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0:
                return json.loads(response[json_start:json_end])
            return json.loads(response)
        except:
            return {"prompt_text": response.strip(), "word_count_suggested": 250 if task_type == 2 else 150}
    
    def _check_essay_relevance(self, essay_text: str, prompt: str) -> bool:
        """
        Fast, separate binary relevance check. The main scoring call was
        observed giving a completely off-topic essay (about pizza, against an
        automation/employment prompt) a 6.5 band / 7.0 task achievement -
        the model's own feedback text correctly identified it as off-topic,
        but the numeric score didn't reflect that at all. Rather than trust
        one call to both judge relevance AND assign consistent numbers,
        this checks relevance on its own and the caller uses it to override
        the score, since real IELTS caps Task Achievement/Response very low
        for a response that doesn't address the prompt at all.
        """
        system_prompt = "You are an IELTS examiner checking only whether an essay addresses its prompt."
        check_prompt = f"""
        IELTS prompt: {prompt}

        Student essay: {essay_text[:1500]}

        Does this essay genuinely attempt to address the given prompt's topic,
        even partially? Answer with exactly one word: YES or NO.
        """
        response = self._call_ollama(check_prompt, system_prompt, timeout=90, num_predict=10, temperature=0.1)
        return "NO" not in response.strip().upper()[:10]

    def score_writing_essay(self, essay_text: str, prompt: str, task_type: int) -> Dict[str, Any]:
        """
        Scores IELTS writing essay
        """
        is_relevant = self._check_essay_relevance(essay_text, prompt)

        system_prompt = "You are an IELTS writing examiner. Score using official criteria."

        criteria = "Task Achievement" if task_type == 1 else "Task Response"
        
        prompt_text = f"""
        Score this IELTS Writing Task {task_type} essay:
        
        Prompt: {prompt}
        
        Essay ({len(essay_text.split())} words):
        {essay_text}
        
        Score 0-9:
        - {criteria}
        - Coherence & Cohesion
        - Lexical Resource
        - Grammatical Range & Accuracy
        
        Output JSON:
        {{
            "band_score": 6.5,
            "task_achievement": 7.0,
            "coherence": 6.5,
            "lexical_resource": 6.0,
            "grammatical_range": 6.5,
            "feedback": "Detailed feedback",
            "corrections": ["error1 -> correction1"],
            "improved_version": "rewritten paragraph example"
        }}
        """
        
        # Essay text embedded in the prompt + a requested rewritten paragraph in
        # the output makes this one of the larger calls - same slow-hardware
        # headroom given to reading/listening generation.
        response = self._call_ollama(prompt_text, system_prompt, timeout=240, temperature=0.4)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0:
                result = json.loads(response[json_start:json_end])
            else:
                result = json.loads(response)
        except (json.JSONDecodeError, ValueError):
            result = {
                "band_score": 6.0,
                "task_achievement": 6.0, "coherence": 6.0,
                "lexical_resource": 6.0, "grammatical_range": 6.0,
                "feedback": "Error parsing. Manual review needed.",
                "corrections": [], "improved_version": ""
            }

        if not is_relevant:
            # Real IELTS caps Task Achievement/Response very low (around 1-2) for
            # a response that doesn't address the prompt, regardless of how
            # fluent the writing otherwise is - the overall band is dragged
            # down accordingly rather than averaging as if it were on-topic.
            result["task_achievement"] = min(float(result.get("task_achievement", 2.0)), 2.0)
            result["band_score"] = min(float(result.get("band_score", 3.0)), 3.5)
            off_topic_note = "This essay does not appear to address the given prompt, which caps the achievable band regardless of writing quality. "
            result["feedback"] = off_topic_note + result.get("feedback", "")

        return result
    
    # ═══════════════════════════════════════════
    # LISTENING MODULE METHODS
    # ═══════════════════════════════════════════
    
    # Section themes match real IELTS Listening structure: social, educational
    # transaction, conversation between students/tutors, and an academic lecture.
    _LISTENING_SECTION_THEMES = [
        (1, "a social/transactional conversation (e.g. booking, registration)"),
        (2, "a monologue in an everyday social context (e.g. a talk about local facilities)"),
        (3, "a conversation between students and a tutor/advisor"),
        (4, "an academic monologue/lecture"),
    ]

    def _generate_listening_section(self, topic: str, band: float, section_number: int, theme: str, questions_per_section: int) -> Dict[str, Any]:
        """
        Generates a single listening section (script excerpt + its questions).
        Kept small/fast so a single call reliably finishes on a local 3B model,
        instead of asking for all 4 sections + 40 questions in one shot.
        """
        system_prompt = "You are an IELTS listening test writer. Create a realistic, concise script excerpt."

        prompt = f"""
        Create IELTS Listening Section {section_number} about "{topic}" for band {band}.
        This section is {theme}.

        Write a short script (100-150 words) and exactly {questions_per_section} questions for it.

        Output JSON only:
        {{
            "context": "short description of the scenario",
            "script": "the script text for this section",
            "questions": [
                {{"number": 1, "question": "...", "answer": "...", "type": "fill_blank"}}
            ]
        }}
        """

        # Local models can be slow on constrained hardware (observed ~3-4 tokens/sec
        # even with the model fully offloaded to GPU) - this is an offline/admin-only
        # generation step, so a generous timeout is fine; num_predict is capped lower
        # than the timeout would allow to keep each section's output tight.
        # Lower temperature: strict JSON output is more important here than
        # creativity, and higher temperature was causing frequent malformed JSON.
        response = self._call_ollama(prompt, system_prompt, timeout=240, num_predict=600, temperature=0.3)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0:
                return json.loads(response[json_start:json_end])
            return json.loads(response)
        except json.JSONDecodeError:
            return {"context": theme, "script": response.strip(), "questions": []}

    def generate_listening_script(self, topic: str, band: float, questions_per_section: int = 3) -> Dict[str, Any]:
        """
        Generates a full IELTS listening test (4 sections) by generating each
        section separately, then combining them. This avoids timing out a
        local 3B model with one huge 40-question generation call.
        """
        sections = []
        full_script_parts = []
        question_number = 1

        for section_number, theme in self._LISTENING_SECTION_THEMES:
            try:
                section = self._generate_listening_section(topic, band, section_number, theme, questions_per_section)
            except Exception:
                section = {"context": theme, "script": "", "questions": []}

            numbered_questions = []
            for q in section.get("questions", []):
                numbered_questions.append({
                    "number": question_number,
                    "question": q.get("question", ""),
                    "answer": q.get("answer", ""),
                    "type": q.get("type", "fill_blank"),
                    "options": q.get("options"),
                })
                question_number += 1

            sections.append({
                "section_number": section_number,
                "context": section.get("context", theme),
                "questions": numbered_questions,
            })
            full_script_parts.append(f"[Section {section_number}] {section.get('script', '')}")

        return {
            "script": "\n\n".join(full_script_parts),
            "sections": sections,
            "total_questions": question_number - 1,
        }
    
    # ═══════════════════════════════════════════
    # READING MODULE METHODS
    # ═══════════════════════════════════════════
    
    def generate_reading_passage(self, topic: str, band: float) -> Dict[str, Any]:
        """
        Generates an IELTS reading passage + questions as two smaller calls
        (passage first, then questions based on it) instead of one large call.

        A single combined call (passage + 8 questions) was timing out even at
        240s on this hardware's ~3-4 tokens/sec throughput, uncontended - the
        same issue generate_listening_script hit, fixed the same way: split
        into smaller pieces so each call finishes in a reasonable time.
        """
        passage = self._generate_reading_passage_text(topic, band)
        questions = self._generate_reading_passage_questions(passage["passage_text"], band)

        return {
            "title": passage["title"],
            "passage_text": passage["passage_text"],
            "word_count": passage.get("word_count", len(passage["passage_text"].split())),
            "questions": questions,
        }

    def _generate_reading_passage_text(self, topic: str, band: float) -> Dict[str, Any]:
        system_prompt = "You are an IELTS reading test writer. Create academic passages."

        prompt = f"""
        Create an IELTS Academic Reading passage about "{topic}" for band {band}.
        300-400 words.

        Output JSON only:
        {{
            "title": "Passage Title",
            "passage_text": "full text..."
        }}
        """

        # Lower temperature: strict JSON output matters more than creativity here,
        # and 0.7 was causing frequent malformed JSON (~5/6 failures in testing).
        response = self._call_ollama(prompt, system_prompt, timeout=150, num_predict=700, temperature=0.3)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0:
                result = json.loads(response[json_start:json_end])
            else:
                result = json.loads(response)
        except json.JSONDecodeError:
            # Full JSON parsing failed (this model breaks strict JSON often enough
            # to matter, even at low temperature) - try to salvage the passage_text
            # field directly via regex before giving up entirely, since the model
            # usually still produces a usable passage even when the JSON around it
            # is malformed (a stray unescaped quote, truncation, etc).
            salvaged = self._salvage_json_string_field(response, "passage_text")
            if not salvaged:
                raise Exception("Model did not return valid JSON for the reading passage.")
            title = self._salvage_json_string_field(response, "title") or "Generated Passage"
            result = {"title": title, "passage_text": salvaged}

        if not result.get("passage_text"):
            raise Exception("Model response was missing passage_text.")

        result["word_count"] = len(result["passage_text"].split())
        return result

    @staticmethod
    def _salvage_json_string_field(text: str, field_name: str) -> Optional[str]:
        """
        Best-effort extraction of a JSON string field's value when the
        surrounding JSON is malformed. Scans for "field_name": " then reads
        until an unescaped closing quote.
        """
        match = re.search(rf'"{field_name}"\s*:\s*"', text)
        if not match:
            return None

        start = match.end()
        chars = []
        i = start
        while i < len(text):
            ch = text[i]
            if ch == '\\' and i + 1 < len(text):
                chars.append(text[i + 1])
                i += 2
                continue
            if ch == '"':
                break
            chars.append(ch)
            i += 1

        value = "".join(chars).strip()
        return value or None

    def _generate_reading_passage_questions(self, passage_text: str, band: float, count: int = 5) -> list:
        system_prompt = "You are an IELTS reading test writer. Write comprehension questions for a given passage."

        prompt = f"""
        Based on this IELTS reading passage, write exactly {count} comprehension
        questions for band {band}. Use a mix of MCQ and True/False/Not Given
        questions, but each individual question must be only ONE of those types.

        Passage:
        {passage_text}

        Output JSON only. The "type" field must be exactly the string "MCQ" or
        exactly the string "T-F-NG" - never both, never any other value.
        MCQ questions must include an "options" array of 4 choices;
        T-F-NG questions must omit "options" (or set it to null).

        {{
            "questions": [
                {{
                    "number": 1,
                    "question": "...",
                    "answer": "...",
                    "type": "MCQ",
                    "options": ["A", "B", "C", "D"]
                }}
            ]
        }}
        """

        response = self._call_ollama(prompt, system_prompt, timeout=220, num_predict=700, temperature=0.3)

        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0:
                questions = json.loads(response[json_start:json_end]).get("questions", [])
            else:
                questions = json.loads(response).get("questions", [])
        except json.JSONDecodeError:
            return []

        return [self._normalize_reading_question_type(q) for q in questions]

    @staticmethod
    def _normalize_reading_question_type(question: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coerce "type" to exactly "MCQ" or "T-F-NG" based on whether real options
        are present, regardless of what string the model actually returned
        (e.g. it has returned the literal "MCQ/T-F-NG" from a prompt example
        instead of picking one - a value that matches neither type, and would
        leave a question with no answer input rendered on the frontend).
        """
        options = question.get("options")
        question["type"] = "MCQ" if isinstance(options, list) and len(options) > 0 else "T-F-NG"
        return question

# ─── SINGLETON INSTANCE ───
# Industry pattern: Create one instance, use everywhere
ollama_service = OllamaService()
