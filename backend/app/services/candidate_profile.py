from datetime import date

from app.models.candidate import CandidateProfile


def recompute_completeness(profile: CandidateProfile) -> None:
    fields = [
        profile.phone,
        profile.location,
        profile.summary,
        profile.current_designation,
        profile.experience_level,
        profile.industry,
        bool(profile.skills),
        bool(profile.education),
        bool(profile.experiences),
    ]
    profile.profile_completeness = round(sum(1 for f in fields if f) / len(fields), 2)


def recompute_total_experience_years(profile: CandidateProfile) -> None:
    """Derive total_experience_years from the candidate's experience entries,
    summing each entry's duration (is_current or a missing end date runs
    through today). Overlapping roles are summed rather than deduplicated,
    matching how candidates typically self-report total experience on a
    resume. No-ops if the candidate has manually overridden the field."""
    if profile.experience_years_manual_override:
        return

    total_days = 0
    for exp in profile.experiences:
        if not exp.start_date:
            continue
        end = date.today() if exp.is_current or not exp.end_date else exp.end_date
        if end < exp.start_date:
            continue
        total_days += (end - exp.start_date).days

    profile.total_experience_years = round(total_days / 365.25, 1)
