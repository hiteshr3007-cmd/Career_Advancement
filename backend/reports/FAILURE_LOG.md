# Failure Log

| Endpoint | Test Type | Error | Root Cause | Status |
|---|---|---|---|---|
| `POST /api/v1/auth/register` | security | Self-register as administrator succeeded | UserRegister.role accepted UserRole.ADMINISTRATOR with no allowlist | FIXED |
| `POST /api/v1/matching/me/compute` | functional | 500 can't adapt type numpy.float32 | cosine_similarity/embeddings leaked numpy scalars into Float columns on commit | FIXED |
| `GET /api/v1/auth/me` + `POST /api/v1/auth/register` (concurrent) | stress | 500 OperationalError Neon connection closed | Double pooling: SQLAlchemy QueuePool + Neon -pooler PgBouncer | FIXED |
