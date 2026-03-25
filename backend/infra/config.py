from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database (TimescaleDB)
    database_url: str = "postgresql://churn:churn123@localhost:5432/churndb"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""

    # CORS (comma-separated origins)
    cors_origins: str = "http://localhost:3000"

    # Stripe (SaaS billing)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Admin Panel
    admin_jwt_secret: str = "change-me-to-a-random-256-bit-secret"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
