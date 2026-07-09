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
