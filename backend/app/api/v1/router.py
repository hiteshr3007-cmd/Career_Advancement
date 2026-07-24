from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analytics,
    auth,
    benchmarks,
    candidates,
    career,
    consultations,
    employers,
    jobs,
    learning,
    matching,
    pipeline,
    resumes,
    scorecard,
    superadmin,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(superadmin.router)
api_router.include_router(candidates.router)
api_router.include_router(resumes.router)
api_router.include_router(benchmarks.router)
api_router.include_router(matching.router)
api_router.include_router(career.router)
api_router.include_router(pipeline.router)
api_router.include_router(scorecard.router)
# Phase 5 — Employer Portal & Job Matching
api_router.include_router(jobs.router)
api_router.include_router(employers.router)
# Phase 6 — Learning Marketplace, Consultations, Analytics
api_router.include_router(learning.router)
api_router.include_router(consultations.router)
api_router.include_router(analytics.router)
