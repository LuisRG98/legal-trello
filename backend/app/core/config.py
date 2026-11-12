
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Case Management API"

    database_url: str

    storage_path: str = "./storage"

    max_pdf_size_bytes: int = 2 * 1024 * 1024
    max_files_per_upload: int = 20

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Password management
    temporary_password_expire_minutes: int = 30
    password_change_token_expire_minutes: int = 10
    password_reset_token_expire_minutes: int = 30

    # Frontend URL used in password recovery links
    frontend_base_url: str = "http://localhost:5173"

    # Resend configuration
    resend_api_key: str | None = None
    email_from: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
