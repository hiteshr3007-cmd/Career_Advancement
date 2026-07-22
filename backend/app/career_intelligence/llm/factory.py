"""Selects the active LLM provider from config. The ONLY place that knows which
vendor is wired in — everything else depends on the LLMProvider interface."""
from __future__ import annotations

from app.config import get_settings
from app.career_intelligence.llm.base import LLMProvider, LLMUnavailable
from app.career_intelligence.llm.openai_compatible import OpenAICompatibleProvider


def get_provider() -> LLMProvider:
    provider = get_settings().phase3_llm_provider.lower()

    if provider in ("ollama", "openai", "openai_compatible"):
        return OpenAICompatibleProvider(
            base_url=get_settings().phase3_llm_base_url if provider != "openai" else None,
            api_key=get_settings().phase3_llm_api_key,
            model=get_settings().phase3_llm_model,
            fallback_model=get_settings().phase3_llm_fallback_model if provider != "openai" else None,
            timeout=get_settings().phase3_llm_timeout,
        )

    # Future: elif provider == "anthropic": return AnthropicProvider(...)
    raise LLMUnavailable(f"Unknown PHASE3_LLM_PROVIDER: {get_settings().phase3_llm_provider}")
