from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import settings

# Shared cloud Postgres providers (Neon, Supabase, etc.) often front the DB with
# their own connection pooler (PgBouncer) on a "-pooler"-style host. Layering
# SQLAlchemy's own QueuePool on top of that causes double-pooling — two layers
# fighting over connection lifecycle, which manifests as random dropped/stale
# connections under load. When the URL points at a pooler, use NullPool instead
# (let the external pooler own pooling entirely); otherwise keep the tuned
# QueuePool sized for local/direct Postgres (see BK-1 in QA_TESTING_GUIDE.pdf).
_is_pooled_endpoint = "-pooler" in settings.database_url

if _is_pooled_endpoint:
    engine = create_engine(settings.database_url, pool_pre_ping=True, poolclass=NullPool)
else:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
