import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import SessionLocal, get_db
from app.models.candidate import CandidateProfile
from app.models.resume import Resume
from app.models.user import User, UserRole
from app.schemas.resume import ResumeOut, ResumeParsedDataOut
from app.services.candidate_profile import recompute_completeness, recompute_total_experience_years
from app.services.resume_parsing import parse_resume
from app.services.resume_parsing.extractor import extract_text
from app.services.storage import storage_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resumes", tags=["Resume Intelligence"])

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_own_profile(db: Session, user: User) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return profile


def _process_resume(resume_id: uuid.UUID) -> None:
    """Runs in a background task with its own DB session."""
    db = SessionLocal()
    try:
        resume = db.get(Resume, resume_id)
        if not resume:
            return
        resume.parsing_status = "processing"
        db.commit()

        try:
            file_bytes = storage_service.download_bytes(resume.storage_key)
            text = extract_text(file_bytes, resume.file_type)
            if not text.strip():
                raise ValueError("No extractable text found in resume")

            parsed_data, method = parse_resume(text)

            resume.extracted_text = text
            resume.parsed_data = parsed_data
            resume.parsing_method = method
            resume.parsing_status = "completed"
            resume.parsing_error = None

            candidate = db.get(CandidateProfile, resume.candidate_id)
            if candidate:
                _apply_parsed_data_to_profile(candidate, parsed_data)
                recompute_completeness(candidate)
                recompute_total_experience_years(candidate)

            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Resume parsing failed for %s", resume_id)
            resume.parsing_status = "failed"
            resume.parsing_error = str(exc)
            db.commit()
    finally:
        db.close()


def _apply_parsed_data_to_profile(candidate: CandidateProfile, parsed_data: dict) -> None:
    from app.models.candidate import CandidateEducation, CandidateExperience, CandidateSkill

    personal = parsed_data.get("personal_info") or {}
    if not candidate.summary and parsed_data.get("summary"):
        candidate.summary = parsed_data["summary"]
    if not candidate.phone and personal.get("phone"):
        candidate.phone = personal["phone"]
    if not candidate.location and personal.get("location"):
        candidate.location = personal["location"]

    candidate.certifications = sorted(set(candidate.certifications or []) | set(parsed_data.get("certifications") or []))
    candidate.keywords = sorted(set(candidate.keywords or []) | set(parsed_data.get("keywords") or []))
    candidate.raw_extracted_data = parsed_data

    existing_skill_names = {s.name.lower() for s in candidate.skills}
    for skill_name in parsed_data.get("skills") or []:
        if skill_name.lower() not in existing_skill_names:
            candidate.skills.append(CandidateSkill(candidate_id=candidate.id, name=skill_name, source="resume"))
            existing_skill_names.add(skill_name.lower())

    if not candidate.education:
        for edu in parsed_data.get("education") or []:
            candidate.education.append(
                CandidateEducation(
                    candidate_id=candidate.id,
                    degree=edu.get("degree"),
                    field_of_study=edu.get("field_of_study"),
                    institution=edu.get("institution"),
                )
            )

    if not candidate.experiences:
        for exp in parsed_data.get("experience") or []:
            candidate.experiences.append(
                CandidateExperience(
                    candidate_id=candidate.id,
                    title=exp.get("title") or exp.get("title_line"),
                    company=exp.get("company"),
                    industry=exp.get("industry"),
                    is_current=bool(exp.get("is_current")),
                    description=exp.get("description"),
                )
            )


@router.post("/upload", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    extension = (file.filename or "").rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    profile = _get_own_profile(db, current_user)

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 10MB limit")

    db.query(Resume).filter(Resume.candidate_id == profile.id, Resume.is_active.is_(True)).update(
        {"is_active": False}
    )
    latest_version = (
        db.query(Resume).filter(Resume.candidate_id == profile.id).count()
    )

    storage_key = storage_service.build_key(profile.id, file.filename)
    storage_service.upload_fileobj(file.file, storage_key, file.content_type or "application/octet-stream")

    resume = Resume(
        candidate_id=profile.id,
        original_file_name=file.filename,
        file_type=extension,
        storage_key=storage_key,
        version=latest_version + 1,
        is_active=True,
        parsing_status="pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    background_tasks.add_task(_process_resume, resume.id)
    return resume


@router.get("", response_model=list[ResumeOut])
def list_resumes(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    return (
        db.query(Resume)
        .filter(Resume.candidate_id == profile.id)
        .order_by(Resume.version.desc())
        .all()
    )


@router.get("/{resume_id}", response_model=ResumeParsedDataOut)
def get_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == profile.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == profile.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    file_bytes = storage_service.download_bytes(resume.storage_key)
    content_type = storage_service.get_content_type(resume.storage_key)
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{resume.original_file_name}"'},
    )


@router.post("/{resume_id}/reparse", response_model=ResumeOut)
def reparse_resume(
    resume_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == profile.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    resume.parsing_status = "pending"
    db.commit()
    background_tasks.add_task(_process_resume, resume.id)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    profile = _get_own_profile(db, current_user)
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.candidate_id == profile.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    storage_service.delete(resume.storage_key)
    db.delete(resume)
    db.commit()
    return None
