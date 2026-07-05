from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "SH-WAF API"
    VERSION:  str = "1.0.0"
    DEBUG:    bool = False

    SUPABASE_URL:      str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Falls back to a local SQLite file when no Postgres URL is configured,
    # so the API boots without the Supabase DB password. The frontend reads
    # live data directly from Supabase REST, so this only backs the API's
    # own endpoints.
    DATABASE_URL: str = "sqlite:///./sh_waf.db"

    SECRET_KEY: str = "change-me-in-production-sh-waf-secret"
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://evoshield-waf.vercel.app",
        "https://*.vercel.app",
    ]

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
