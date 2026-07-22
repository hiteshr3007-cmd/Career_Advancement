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

from app.career_intelligence.llm.base import LLMProvider, LLMUnavailable


def _conforms(result: dict, schema: dict) -> bool:
    """Lightweight check that ``result`` is an instance of ``schema`` (not the
    schema echoed back) with its required content actually present. Catches the
    two small-model failure modes: schema-echo and empty required fields. Only
    validates top-level required keys — grammar-constrained decoding handles
    the nested structure."""
    if not isinstance(result, dict):
        return False
    props = schema.get("properties", {})
    # Schema-echo: model returned the schema definition instead of an instance.
    if "properties" not in props and "properties" in result and "type" in result:
        return False
    for key in schema.get("required", []):
        if key not in result:
            return False
        val = result[key]
        expected = props.get(key, {}).get("type")
        if expected == "array" and (not isinstance(val, list) or not val):
            return False
        if expected == "string" and (not isinstance(val, str) or not val.strip()):
            return False
    return True


class OpenAICompatibleProvider(LLMProvider):
    def __init__(
        self,
        base_url: str | None,
        api_key: str,
        model: str,
        fallback_model: str | None = None,
        timeout: float = 90.0,
    ):
        self.name = f"openai_compatible:{model}"
        self._base_url = base_url or None
        self._api_key = api_key
        self._model = model
        self._fallback_model = fallback_model or None
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
        """Schema-constrained structured generation.

        Small local models are unreliable at emitting a JSON *instance* of a
        schema when only asked to via the prompt (they echo the schema back or
        drop required keys). So we use grammar-constrained decoding (Ollama /
        OpenAI ``json_schema`` response_format), which forces conforming output.
        Order of attempts:
          1. constrained decoding on the primary model
          2. constrained decoding on the fallback model (a stronger local model)
             — only if the primary's output still fails to conform (e.g. empty
             array where content is required)
          3. last-resort ``json_object`` mode on the primary model, for servers
             too old to support ``json_schema``
        Raises LLMUnavailable if nothing conforms, so callers degrade to
        deterministic output.
        """
        client = self._get_client()
        errors: list[str] = []

        models = [self._model]
        if self._fallback_model and self._fallback_model != self._model:
            models.append(self._fallback_model)

        for model in models:
            try:
                result = self._call(client, model, system, prompt, schema, constrained=True)
            except LLMUnavailable as exc:
                errors.append(str(exc))
                continue
            if _conforms(result, schema):
                return result
            errors.append(f"{model}: output did not conform to schema (missing/empty required fields)")

        # Fallback for servers without json_schema support: prompt-embedded schema.
        try:
            result = self._call(client, self._model, system, prompt, schema, constrained=False)
            if _conforms(result, schema):
                return result
            errors.append(f"{self._model} (json_object): output did not conform")
        except LLMUnavailable as exc:
            errors.append(str(exc))

        raise LLMUnavailable("; ".join(errors) or "LLM produced no conforming output")

    def _call(
        self, client, model: str, system: str, prompt: str, schema: dict, *, constrained: bool
    ) -> dict:
        if constrained:
            system_full = (
                f"{system}\n\n"
                f"Respond with a single valid JSON object only — no markdown, no prose."
            )
            response_format = {
                "type": "json_schema",
                "json_schema": {"name": "result", "strict": True, "schema": schema},
            }
        else:
            system_full = (
                f"{system}\n\n"
                f"Respond with a single valid JSON object only — no markdown, no prose. "
                f"It must conform to this JSON schema:\n{json.dumps(schema)}"
            )
            response_format = {"type": "json_object"}

        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_full},
                    {"role": "user", "content": prompt},
                ],
                response_format=response_format,
                temperature=0.3,
            )
        except Exception as exc:
            raise LLMUnavailable(f"LLM call failed ({model}): {exc}") from exc

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
            raise LLMUnavailable(f"LLM returned non-JSON output ({model}): {content[:200]}") from exc
