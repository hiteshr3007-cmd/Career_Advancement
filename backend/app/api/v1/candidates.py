import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_roles
from app.database import get_db
from app.models.candidate import (
    CandidateEducation,
    CandidateExperience,
    CandidateProfile,
    CandidateSkill,
)
from app.models.user import User, UserRole
from app.services.candidate_profile import recompute_completeness
from app.schemas.candidate import (
    CandidateProfileOut,
    CandidateProfileUpdate,
    CandidateSearchFilters,
    EducationIn,
    EducationOut,
    ExperienceIn,
    ExperienceOut,
    SkillIn,
    SkillOut,
)

router = APIRouter(prefix="/candidates", tags=["Candidate Management"])

VIEWER_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


def _get_own_profile(db: Session, user: User) -> CandidateProfile:
    profile = (
        db.query(CandidateProfile)
        .options(
            joinedload(CandidateProfile.skills),
            joinedload(CandidateProfile.education),
            joinedload(CandidateProfile.experiences),
        )
        .filter(CandidateProfile.user_id == user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return profile


@router.get("/me", response_model=CandidateProfileOut)
def get_my_profile(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    return _get_own_profile(db, current_user)


@router.put("/me", response_model=CandidateProfileOut)
def update_my_profile(
    payload: CandidateProfileUpdate,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    update_data = payload.model_dump(exclude_unset=True)
    if "career_preferences" in update_data and update_data["career_preferences"] is not None:
        update_data["career_preferences"] = update_data["career_preferences"]
    for field, value in update_data.items():
        setattr(profile, field, value)
    recompute_completeness(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/me/skills", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def add_skill(
    payload: SkillIn,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    skill = CandidateSkill(candidate_id=profile.id, source="manual", **payload.model_dump())
    db.add(skill)
    recompute_completeness(profile)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/me/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    skill = db.query(CandidateSkill).filter(
        CandidateSkill.id == skill_id, CandidateSkill.candidate_id == profile.id
    ).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return None


@router.post("/me/education", response_model=EducationOut, status_code=status.HTTP_201_CREATED)
def add_education(
    payload: EducationIn,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    entry = CandidateEducation(candidate_id=profile.id, **payload.model_dump())
    db.add(entry)
    recompute_completeness(profile)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/me/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    education_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    entry = db.query(CandidateEducation).filter(
        CandidateEducation.id == education_id, CandidateEducation.candidate_id == profile.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Education entry not found")
    db.delete(entry)
    db.commit()
    return None


@router.post("/me/experience", response_model=ExperienceOut, status_code=status.HTTP_201_CREATED)
def add_experience(
    payload: ExperienceIn,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    entry = CandidateExperience(candidate_id=profile.id, **payload.model_dump())
    db.add(entry)
    recompute_completeness(profile)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/me/experience/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    experience_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    entry = db.query(CandidateExperience).filter(
        CandidateExperience.id == experience_id, CandidateExperience.candidate_id == profile.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience entry not found")
    db.delete(entry)
    db.commit()
    return None


# ---- Candidate Profile Database (Module 4): search & lookup for recruiters/HR/employers/admins ----

@router.get("", response_model=list[CandidateProfileOut])
def search_candidates(
    filters: CandidateSearchFilters = Depends(),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(CandidateProfile).options(
        joinedload(CandidateProfile.skills),
        joinedload(CandidateProfile.education),
        joinedload(CandidateProfile.experiences),
    )

    if filters.industry:
        query = query.filter(CandidateProfile.industry.ilike(f"%{filters.industry}%"))
    if filters.functional_area:
        query = query.filter(CandidateProfile.functional_area.ilike(f"%{filters.functional_area}%"))
    if filters.experience_level:
        query = query.filter(CandidateProfile.experience_level == filters.experience_level)
    if filters.min_experience_years is not None:
        query = query.filter(CandidateProfile.total_experience_years >= filters.min_experience_years)
    if filters.max_experience_years is not None:
        query = query.filter(CandidateProfile.total_experience_years <= filters.max_experience_years)
    if filters.skill:
        query = query.filter(
            CandidateProfile.skills.any(CandidateSkill.name.ilike(f"%{filters.skill}%"))
        )

    return query.offset(offset).limit(limit).all()


@router.get("/{candidate_id}", response_model=CandidateProfileOut)
def get_candidate_by_id(
    candidate_id: uuid.UUID,
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(CandidateProfile)
        .options(
            joinedload(CandidateProfile.skills),
            joinedload(CandidateProfile.education),
            joinedload(CandidateProfile.experiences),
        )
        .filter(CandidateProfile.id == candidate_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return profile
