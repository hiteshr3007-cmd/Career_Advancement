"""Phase 6 — Learning Marketplace service (Module 15).

Two responsibilities:
  1. build_catalog: turn a candidate's skill gaps (from their benchmark matches)
     into concrete, enrollable learning items using the curated course catalog.
  2. apply_completion: the "closed loop" — when a candidate completes a learning
     item, bump the targeted skill's proficiency (or add the skill) and recompute
     profile completeness so the scorecard/gap analysis reflect the new learning.
"""
from sqlalchemy.orm import Session

from app.career_intelligence.course_catalog import resources_for_skill
from app.models.candidate import CandidateProfile, CandidateSkill
from app.models.learning import Enrollment
from app.models.match import CandidateBenchmarkMatch
from app.services.candidate_profile import recompute_completeness

PROFICIENCY_LADDER = ["beginner", "intermediate", "advanced", "expert"]


def build_catalog(db: Session, candidate: CandidateProfile) -> list[dict]:
    """Recommend learning items for the candidate's skill gaps. Gaps come from
    their computed benchmark matches; if none exist yet, fall back to levelling
    up their existing skills."""
    target_skills: list[str] = []
    matches = (
        db.query(CandidateBenchmarkMatch)
        .filter(CandidateBenchmarkMatch.candidate_id == candidate.id)
        .all()
    )
    for m in matches:
        target_skills.extend(m.missing_required_skills or [])
    if not target_skills:
        target_skills = [s.name for s in candidate.skills]

    seen: set[str] = set()
    items: list[dict] = []
    for skill in target_skills:
        for res in resources_for_skill(skill):
            key = res["title"].lower()
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "title": res["title"],
                    "provider": res.get("provider"),
                    "url": res.get("url"),
                    "kind": "certification" if res.get("resource_type") == "certification" else "course",
                    "skill_target": skill,
                }
            )
    return items


def apply_completion(db: Session, enrollment: Enrollment) -> None:
    """Reflect a completed learning item back into the candidate's skills.
    Idempotent-ish: safe to call once when an enrollment transitions to
    completed. No-op if there's no skill_target to credit."""
    if not enrollment.skill_target:
        return
    candidate = db.get(CandidateProfile, enrollment.candidate_id)
    if not candidate:
        return

    target = enrollment.skill_target.strip().lower()
    existing = next((s for s in candidate.skills if s.name.strip().lower() == target), None)
    if existing:
        current = (existing.proficiency or "").strip().lower()
        if current in PROFICIENCY_LADDER:
            idx = min(PROFICIENCY_LADDER.index(current) + 1, len(PROFICIENCY_LADDER) - 1)
            existing.proficiency = PROFICIENCY_LADDER[idx]
        else:
            existing.proficiency = "intermediate"
    else:
        db.add(
            CandidateSkill(
                candidate_id=candidate.id,
                name=enrollment.skill_target,
                proficiency="intermediate",
                category="technical",
                source="learning",
            )
        )
        db.flush()  # so recompute_completeness sees the new skill in the relationship
        db.refresh(candidate)

    recompute_completeness(candidate)
