# backend/app/services/__init__.py

from .ollama_service import ollama_service, OllamaService

__all__ = ["ollama_service", "OllamaService"]