import logging

from sklearn.feature_extraction.text import HashingVectorizer

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384

# --- OpenAI embeddings (disabled for now, no OpenAI account/credits assumed) ---
# Re-enable by restoring this and pointing generate_embedding() at it; also
# bump EMBEDDING_DIM back to 1536 in this file, app/models/candidate.py and
# app/models/benchmark.py, and in the initial Alembic migration.
#
# from openai import OpenAI
# from tenacity import retry, stop_after_attempt, wait_exponential
# from app.config import settings
#
# class EmbeddingUnavailable(Exception):
#     pass
#
# @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
# def _call_embeddings_api(text: str) -> list[float]:
#     client = OpenAI(api_key=settings.openai_api_key)
#     response = client.embeddings.create(model=settings.embedding_model, input=text[:8000])
#     return response.data[0].embedding
#
# def generate_embedding(text: str) -> list[float]:
#     if not settings.openai_api_key:
#         raise EmbeddingUnavailable("OPENAI_API_KEY is not configured")
#     if not text or not text.strip():
#         raise ValueError("Cannot embed empty text")
#     return _call_embeddings_api(text)


class EmbeddingUnavailable(Exception):
    """Kept for interface compatibility with callers; local hashing never
    raises this, but callers still catch it in case embeddings are disabled
    entirely in the future."""


_vectorizer = HashingVectorizer(
    n_features=EMBEDDING_DIM,
    norm="l2",
    alternate_sign=False,
    ngram_range=(1, 2),
)


def generate_embedding(text: str) -> list[float]:
    """Local, deterministic embedding via feature hashing (no model download,
    no network call, no API cost). Captures word/bigram overlap between
    candidate and benchmark text — good enough for skill/keyword matching,
    though it won't catch synonyms an LLM embedding would (e.g. "ML" vs
    "machine learning")."""
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    vector = _vectorizer.transform([text])
    return vector.toarray()[0].tolist()


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
