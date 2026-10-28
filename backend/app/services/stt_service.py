# backend/app/services/stt_service.py
# Local speech-to-text using faster-whisper (in-process, no separate server)

import os

from faster_whisper import WhisperModel

WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")


class STTService:
    """
    Wraps faster-whisper for offline speech-to-text.
    Loads the model once and reuses it across requests.
    """

    def __init__(self):
        self._model = None

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            self._model = WhisperModel(
                WHISPER_MODEL_SIZE,
                device=WHISPER_DEVICE,
                compute_type=WHISPER_COMPUTE_TYPE,
            )
        return self._model

    def transcribe(self, audio_path: str) -> str:
        """
        Transcribes the audio file at `audio_path` and returns the full text.
        """
        model = self._get_model()
        # vad_filter skips non-speech segments before transcribing - without it,
        # Whisper models reliably hallucinate filler text ("you", "thank you")
        # on silent/near-silent audio (e.g. a mic that didn't actually capture
        # anything) instead of returning nothing, which is confusing to a user
        # who gets a nonsense transcript with no indication anything went wrong.
        segments, _info = model.transcribe(audio_path, beam_size=5, vad_filter=True)
        return " ".join(segment.text.strip() for segment in segments).strip()


# ─── SINGLETON INSTANCE ───
stt_service = STTService()
