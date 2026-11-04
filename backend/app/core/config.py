from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Case Management API"

    database_url: str = (
        "postgresql+psycopg://case_app:DevPassword2026Example"
        "@localhost:5433/case_management_db"
    )

    storage_path: str = "./storage"

    max_pdf_size_bytes: int = 2 * 1024 * 1024

    max_files_per_upload: int = 20

    secret_key: str
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()