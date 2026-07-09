import logging

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingUnavailable(Exception):
    pass


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _call_embeddings_api(text: str) -> list[float]:
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.embeddings.create(model=settings.embedding_model, input=text[:8000])
    return response.data[0].embedding


def generate_embedding(text: str) -> list[float]:
    if not settings.openai_api_key:
        raise EmbeddingUnavailable("OPENAI_API_KEY is not configured")
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    return _call_embeddings_api(text)


def build_candidate_embedding_text(candidate) -> str:
    parts = [
        candidate.summary or "",
        candidate.current_designation or "",
        candidate.industry or "",
        candidate.functional_area or "",
        ", ".join(skill.name for skill in candidate.skills),
        ", ".join(candidate.certifications or []),
        ", ".join(exp.title or "" for exp in candidate.experiences),
    ]
    return "\n".join(p for p in parts if p)


def build_benchmark_embedding_text(benchmark) -> str:
    parts = [
        benchmark.name,
        benchmark.category,
        benchmark.functional_area or "",
        benchmark.description or "",
        ", ".join(benchmark.required_skills or []),
        ", ".join(benchmark.preferred_skills or []),
        ", ".join(benchmark.required_certifications or []),
    ]
    return "\n".join(p for p in parts if p)
