import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, TimeoutError as SQLTimeoutError

from app.api.v1.router import api_router
from app.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Career Growth & Talent Intelligence Platform API",
    version="0.1.0",
)


@app.exception_handler(SQLTimeoutError)
@app.exception_handler(OperationalError)
async def db_unavailable_handler(request: Request, exc: Exception):
    """BK-1: under heavy load the connection pool can be exhausted (QueuePool
    timeout) or the DB briefly unreachable. Degrade gracefully to 503 + Retry-After
    instead of surfacing a raw 500."""
    logger.warning("Database unavailable/pool exhausted on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Service temporarily busy, please retry shortly."},
        headers={"Retry-After": "5"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "environment": settings.environment}
