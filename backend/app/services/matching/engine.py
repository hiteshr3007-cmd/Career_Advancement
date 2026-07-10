import math

from app.models.benchmark import Benchmark
from app.models.candidate import CandidateProfile

WEIGHT_REQUIRED_SKILLS = 0.40
WEIGHT_PREFERRED_SKILLS = 0.15
WEIGHT_CERTIFICATIONS = 0.15
WEIGHT_EXPERIENCE = 0.15
WEIGHT_SEMANTIC = 0.15


def _normalize(values: list[str]) -> set[str]:
    return {v.strip().lower() for v in values if v and v.strip()}


def _skill_overlap(candidate_skills: set[str], target_skills: set[str]) -> tuple[set[str], set[str], float]:
    if not target_skills:
        return set(), set(), 1.0
    matched = candidate_skills & target_skills
    missing = target_skills - candidate_skills
    ratio = len(matched) / len(target_skills)
    return matched, missing, ratio


def _experience_fit(
    candidate_years: float | None, min_years: float, max_years: float | None
) -> tuple[float, float]:
    """Returns (fit_ratio in [0,1], gap_years). Positive gap means candidate is short."""
    years = candidate_years or 0.0
    if years < min_years:
        gap = min_years - years
        fit = max(0.0, 1 - (gap / max(min_years, 1)))
        return fit, gap
    if max_years is not None and years > max_years:
        overshoot = years - max_years
        fit = max(0.3, 1 - (overshoot / max(max_years, 1)) * 0.2)
        return fit, 0.0
    return 1.0, 0.0


def cosine_similarity(vec_a, vec_b) -> float:
    # pgvector returns embedding columns as numpy arrays, so avoid truthiness
    # checks on the vectors themselves (ambiguous for arrays) — check length instead.
    if vec_a is None or vec_b is None:
        return 0.0
    vec_a = list(vec_a)
    vec_b = list(vec_b)
    if len(vec_a) == 0 or len(vec_b) == 0 or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def compute_match(candidate: CandidateProfile, benchmark: Benchmark) -> dict:
    candidate_skills = _normalize([s.name for s in candidate.skills])
    candidate_certs = _normalize(candidate.certifications or [])

    required_skills = _normalize(benchmark.required_skills)
    preferred_skills = _normalize(benchmark.preferred_skills)
    required_certs = _normalize(benchmark.required_certifications)

    matched_required, missing_required, required_ratio = _skill_overlap(candidate_skills, required_skills)
    matched_preferred, _missing_preferred, preferred_ratio = _skill_overlap(candidate_skills, preferred_skills)
    matched_certs, missing_certs, cert_ratio = _skill_overlap(candidate_certs, required_certs)

    experience_fit, experience_gap = _experience_fit(
        candidate.total_experience_years, benchmark.min_experience_years, benchmark.max_experience_years
    )

    # Coerce to Python float early: cosine_similarity can return numpy scalars
    # when embeddings come from pgvector/sklearn, and psycopg2 cannot adapt them.
    semantic_similarity = float(cosine_similarity(candidate.profile_embedding, benchmark.benchmark_embedding))
    semantic_similarity = max(0.0, min(1.0, semantic_similarity))

    match_score = float(
        (
            required_ratio * WEIGHT_REQUIRED_SKILLS
            + preferred_ratio * WEIGHT_PREFERRED_SKILLS
            + cert_ratio * WEIGHT_CERTIFICATIONS
            + experience_fit * WEIGHT_EXPERIENCE
            + semantic_similarity * WEIGHT_SEMANTIC
        )
        * 100
    )

    readiness_score = float(
        ((required_ratio * 0.5) + (cert_ratio * 0.25) + (experience_fit * 0.25)) * 100
    )
    experience_gap = float(experience_gap)

    gap_summary = {
        "skill_gap": {
            "missing_required": sorted(missing_required),
            "missing_preferred": sorted(preferred_skills - candidate_skills),
            "required_match_ratio": round(required_ratio, 2),
        },
        "certification_gap": {
            "missing": sorted(missing_certs),
            "match_ratio": round(cert_ratio, 2),
        },
        "experience_gap": {
            "years_short": round(experience_gap, 1),
            "candidate_years": float(candidate.total_experience_years or 0),
            "benchmark_min_years": float(benchmark.min_experience_years),
        },
        "overall_recommendation": (
            "ready" if readiness_score >= 80 else "developing" if readiness_score >= 50 else "not_ready"
        ),
    }

    return {
        "match_score": round(match_score, 2),
        "readiness_score": round(readiness_score, 2),
        "semantic_similarity": round(semantic_similarity, 4),
        "matched_required_skills": sorted(matched_required),
        "missing_required_skills": sorted(missing_required),
        "matched_preferred_skills": sorted(matched_preferred),
        "missing_certifications": sorted(missing_certs),
        "experience_gap_years": round(experience_gap, 1),
        "gap_summary": gap_summary,
    }
