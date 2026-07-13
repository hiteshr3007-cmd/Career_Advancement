"""Self-contained Phase 3 config (env-driven, does not depend on app.config).

Defaults target a local Ollama instance. Switching providers later is a matter
of changing these env vars (Ollama -> OpenAI) or adding one provider class
(Claude) — no changes to the Module 7/8/9 code.
"""
import os


class Phase3Settings:
    # Whether to attempt the LLM narrative layer at all. When false (or when the
    # provider is unreachable) every module falls back to deterministic output.
    llm_enabled: bool = os.getenv("PHASE3_LLM_ENABLED", "true").lower() == "true"

    # "ollama" and "openai" share one OpenAI-compatible implementation; they
    # differ only by base_url + api_key + model. "anthropic" would be a new class.
    llm_provider: str = os.getenv("PHASE3_LLM_PROVIDER", "ollama")

    # Ollama's OpenAI-compatible endpoint. For real OpenAI, unset/blank this.
    llm_base_url: str = os.getenv("PHASE3_LLM_BASE_URL", "http://localhost:11434/v1")
    llm_model: str = os.getenv("PHASE3_LLM_MODEL", "llama3.1:8b")
    llm_api_key: str = os.getenv("PHASE3_LLM_API_KEY", "ollama")
    llm_timeout: float = float(os.getenv("PHASE3_LLM_TIMEOUT", "90"))


settings = Phase3Settings()
