"""OpenAI-compatible LLM provider — covers BOTH local Ollama and real OpenAI.

Ollama exposes an OpenAI-compatible API at http://localhost:11434/v1, so the
same `openai` SDK client works for both; they differ only by base_url/api_key/
model. That's what makes the eventual Ollama -> OpenAI switch a pure config
change. (Claude would be a separate provider class implementing LLMProvider.)

The `openai` package is imported lazily so that importing phase3 never fails
when it isn't installed / the LLM path isn't used.
"""
from __future__ import annotations

import json

from phase3.llm.base import LLMProvider, LLMUnavailable


class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, base_url: str | None, api_key: str, model: str, timeout: float = 90.0):
        self.name = f"openai_compatible:{model}"
        self._base_url = base_url or None
        self._api_key = api_key
        self._model = model
        self._timeout = timeout
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from openai import OpenAI
            except ImportError as exc:  # pragma: no cover
                raise LLMUnavailable("openai SDK not installed (pip install openai)") from exc
            self._client = OpenAI(base_url=self._base_url, api_key=self._api_key, timeout=self._timeout)
        return self._client

    def health(self) -> bool:
        try:
            client = self._get_client()
            client.models.list()
            return True
        except Exception:
            return False

    def generate_structured(self, system: str, prompt: str, schema: dict) -> dict:
        client = self._get_client()
        # Embed the schema in the instruction and force JSON object output —
        # this mode is supported by both Ollama and OpenAI across versions,
        # unlike strict json_schema which is OpenAI-only / newer-Ollama-only.
        system_full = (
            f"{system}\n\n"
            f"Respond with a single valid JSON object only — no markdown, no prose. "
            f"It must conform to this JSON schema:\n{json.dumps(schema)}"
        )
        try:
            resp = client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_full},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
        except Exception as exc:
            raise LLMUnavailable(f"LLM call failed: {exc}") from exc

        content = resp.choices[0].message.content or ""
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            # Some local models wrap JSON in stray text; try to salvage the object.
            start, end = content.find("{"), content.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(content[start:end + 1])
                except json.JSONDecodeError:
                    pass
            raise LLMUnavailable(f"LLM returned non-JSON output: {content[:200]}") from exc
