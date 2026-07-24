"""Phase 5 — AI Job Matching Engine (Module 13).

Scores a candidate against a Job requisition, reusing the same set-overlap +
experience-fit + semantic-similarity machinery as the benchmark matching engine
(app/services/matching/engine.py) so scores are consistent across the platform.
Matches are computed on the fly (no persistence) — jobs and candidate profiles
change often enough that caching would mostly serve stale scores.
"""
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.services.matching.engine import (
    WEIGHT_CERTIFICATIONS,
    WEIGHT_EXPERIENCE,
    WEIGHT_PREFERRED_SKILLS,
    WEIGHT_REQUIRED_SKILLS,
    WEIGHT_SEMANTIC,
    _experience_fit,
    _normalize,
    _skill_overlap,
    cosine_similarity,
)


def build_job_embedding_text(job: Job) -> str:
    parts = [
        job.title or "",
        job.industry or "",
        job.functional_area or "",
        job.description or "",
        ", ".join(job.required_skills or []),
        ", ".join(job.preferred_skills or []),
        ", ".join(job.required_certifications or []),
    ]
    return "\n".join(p for p in parts if p)


def compute_job_match(candidate: CandidateProfile, job: Job) -> dict:
    candidate_skills = _normalize([s.name for s in candidate.skills])
    candidate_certs = _normalize(candidate.certifications or [])

    required_skills = _normalize(job.required_skills or [])
    preferred_skills = _normalize(job.preferred_skills or [])
    required_certs = _normalize(job.required_certifications or [])

    matched_required, missing_required, required_ratio = _skill_overlap(candidate_skills, required_skills)
    matched_preferred, _missing_pref, preferred_ratio = _skill_overlap(candidate_skills, preferred_skills)
    matched_certs, missing_certs, cert_ratio = _skill_overlap(candidate_certs, required_certs)

    experience_fit, experience_gap = _experience_fit(
        candidate.total_experience_years, job.min_experience_years or 0, job.max_experience_years
    )

    semantic = cosine_similarity(candidate.profile_embedding, job.job_embedding)
    semantic = max(0.0, min(1.0, semantic))

    match_score = (
        required_ratio * WEIGHT_REQUIRED_SKILLS
        + preferred_ratio * WEIGHT_PREFERRED_SKILLS
        + cert_ratio * WEIGHT_CERTIFICATIONS
        + experience_fit * WEIGHT_EXPERIENCE
        + semantic * WEIGHT_SEMANTIC
    ) * 100

    readiness_score = (
        (required_ratio * 0.5) + (cert_ratio * 0.25) + (experience_fit * 0.25)
    ) * 100

    recommendation = (
        "ready" if readiness_score >= 80 else "developing" if readiness_score >= 50 else "not_ready"
    )

    return {
        "match_score": round(match_score, 2),
        "readiness_score": round(readiness_score, 2),
        "matched_required_skills": sorted(matched_required),
        "missing_required_skills": sorted(missing_required),
        "matched_preferred_skills": sorted(matched_preferred),
        "missing_certifications": sorted(missing_certs),
        "experience_gap_years": round(experience_gap, 1),
        "recommendation": recommendation,
    }
