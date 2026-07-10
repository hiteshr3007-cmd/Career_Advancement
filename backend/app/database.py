from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import settings


def _build_engine():
    """Neon pooled endpoints already multiplex via PgBouncer. Combining that with
    SQLAlchemy QueuePool causes 'server closed the connection unexpectedly'
    under concurrent load. Use NullPool for pooler URLs; keep a bounded pool
    for direct Postgres (e.g. local docker)."""
    url = settings.database_url
    kwargs: dict = {"pool_pre_ping": True}
    if "-pooler" in url:
        kwargs["poolclass"] = NullPool
    else:
        kwargs.update(
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=300,
        )
    return create_engine(url, **kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
