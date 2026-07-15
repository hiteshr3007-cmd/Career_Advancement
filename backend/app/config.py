from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    jwt_algorithm: str = "HS256"

    # The refresh token is set as an httpOnly cookie (NEW-2 hardening) rather
    # than returned in the JSON body, so page scripts can't read it. `Secure`
    # requires HTTPS, which local dev over http doesn't have — flip this on in
    # production via COOKIE_SECURE=true.
    cookie_secure: bool = False

    database_url: str = "postgresql+psycopg2://platform:platform@localhost:5433/career_platform"

    # Connection-pool sizing (BK-1). Defaults raised well above SQLAlchemy's
    # stock 5+10 so the API doesn't exhaust the pool under moderate concurrency.
    db_pool_size: int = 20
    db_max_overflow: int = 40
    db_pool_timeout: int = 10  # seconds to wait for a connection before erroring

    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = "career-platform-resumes"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    cors_origins: str = "http://localhost:3000"

    # Comma-separated allowlist of emails that become administrators on register.
    # Nobody outside this list can ever obtain the administrator role.
    admin_emails: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
