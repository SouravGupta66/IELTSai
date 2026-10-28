# backend/app/services/tts_service.py
# Local text-to-speech using Piper (in-process, no separate server)

import os
import wave
import uuid

from piper import PiperVoice

VOICE_MODEL_PATH = os.getenv(
    "PIPER_VOICE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "piper", "en_US-lessac-medium.onnx"),
)
AUDIO_OUTPUT_DIR = "uploads/audio/listening"


class TTSService:
    """
    Wraps Piper for offline text-to-speech.
    Loads the voice model once and reuses it across requests.
    """

    def __init__(self):
        self._voice = None

    def _get_voice(self) -> PiperVoice:
        if self._voice is None:
            self._voice = PiperVoice.load(VOICE_MODEL_PATH)
        return self._voice

    def synthesize_to_file(self, text: str, file_name: str | None = None) -> str:
        """
        Synthesizes `text` to a WAV file under uploads/audio/listening/
        and returns the relative path.
        """
        os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
        file_name = file_name or f"{uuid.uuid4()}.wav"
        file_path = os.path.join(AUDIO_OUTPUT_DIR, file_name)

        voice = self._get_voice()
        with wave.open(file_path, "wb") as wav_file:
            voice.synthesize_wav(text, wav_file)

        return file_path


# ─── SINGLETON INSTANCE ───
tts_service = TTSService()
