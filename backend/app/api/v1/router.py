from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    benchmarks,
    candidates,
    career,
    matching,
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
api_router.include_router(scorecard.router)
