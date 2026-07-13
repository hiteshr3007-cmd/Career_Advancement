"""Selects the active LLM provider from config. The ONLY place that knows which
vendor is wired in — everything else depends on the LLMProvider interface."""
from __future__ import annotations

from phase3.config import settings
from phase3.llm.base import LLMProvider, LLMUnavailable
from phase3.llm.openai_compatible import OpenAICompatibleProvider


def get_provider() -> LLMProvider:
    provider = settings.llm_provider.lower()

    if provider in ("ollama", "openai", "openai_compatible"):
        return OpenAICompatibleProvider(
            base_url=settings.llm_base_url if provider != "openai" else None,
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            timeout=settings.llm_timeout,
        )

    # Future: elif provider == "anthropic": return AnthropicProvider(...)
    raise LLMUnavailable(f"Unknown PHASE3_LLM_PROVIDER: {settings.llm_provider}")
