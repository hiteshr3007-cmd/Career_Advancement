"""Provider-agnostic LLM interface.

Everything in Phase 3 depends only on this interface, never on a vendor SDK.
Swapping Ollama -> OpenAI is a config change; adding Claude is one new subclass.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class LLMUnavailable(Exception):
    """Raised when the LLM cannot be reached or is disabled. Callers must catch
    this and fall back to deterministic output — Phase 3 never hard-fails on it."""


class LLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    def generate_structured(self, system: str, prompt: str, schema: dict) -> dict:
        """Return a dict conforming to `schema` (JSON Schema). Implementations
        should enforce JSON output and raise LLMUnavailable on transport errors."""
        raise NotImplementedError

    @abstractmethod
    def health(self) -> bool:
        """Cheap reachability check. False => callers should skip the LLM layer."""
        raise NotImplementedError
