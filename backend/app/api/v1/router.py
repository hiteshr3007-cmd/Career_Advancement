from fastapi import APIRouter

from app.api.v1 import auth, benchmarks, candidates, matching, resumes

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(candidates.router)
api_router.include_router(resumes.router)
api_router.include_router(benchmarks.router)
api_router.include_router(matching.router)
