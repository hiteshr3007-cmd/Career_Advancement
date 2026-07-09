import logging

from app.services.resume_parsing.llm_parser import LLMParserUnavailable, parse_resume_with_llm
from app.services.resume_parsing.rules_parser import parse_resume_with_rules

logger = logging.getLogger(__name__)

RULES_CONFIDENCE_THRESHOLD = 0.7


def _merge_llm_into_rules(rules_data: dict, llm_data: dict) -> dict:
    """Prefer LLM output for any field the rules-based pass left empty."""
    merged = dict(llm_data)
    personal = dict(llm_data.get("personal_info") or {})
    rules_personal = rules_data.get("personal_info") or {}
    for key, value in rules_personal.items():
        if not personal.get(key) and value:
            personal[key] = value
    merged["personal_info"] = personal

    for list_field in ("skills", "certifications", "keywords"):
        combined = set(merged.get(list_field) or []) | set(rules_data.get(list_field) or [])
        merged[list_field] = sorted(combined)

    return merged


def parse_resume(resume_text: str) -> tuple[dict, str]:
    """Parse resume text into structured data.

    Returns (parsed_data, method) where method is one of 'rules', 'llm', 'hybrid'.
    Falls back to LLM extraction when the rules-based pass has low confidence,
    and gracefully degrades to rules-only output if the LLM is unavailable.
    """
    rules_data, confidence = parse_resume_with_rules(resume_text)

    if confidence >= RULES_CONFIDENCE_THRESHOLD:
        return rules_data, "rules"

    try:
        llm_data = parse_resume_with_llm(resume_text)
    except LLMParserUnavailable:
        logger.warning("LLM parser unavailable, falling back to rules-only extraction")
        return rules_data, "rules"
    except Exception:
        logger.exception("LLM resume parsing failed, falling back to rules-only extraction")
        return rules_data, "rules"

    merged = _merge_llm_into_rules(rules_data, llm_data)
    return merged, "hybrid"
