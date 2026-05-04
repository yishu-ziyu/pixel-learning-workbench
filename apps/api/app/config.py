from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pixel Learning API"
    api_prefix: str = "/api"
    model_provider: str = "heuristic"
    secret_key: str = "dev-secret-key"
    session_ttl_hours: int = 168
    magic_link_ttl_minutes: int = 20
    cors_origins: list[str] = ["http://127.0.0.1:3000", "http://localhost:3000"]
    cors_origin_regex: str | None = r"https?://(127\.0\.0\.1|localhost):\d+"
    frontend_base_url: str = "http://127.0.0.1:3000"
    database_url: str | None = None

    model_config = SettingsConfigDict(env_prefix="PIXEL_", extra="ignore")

    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parents[3]

    @property
    def data_dir(self) -> Path:
        return self.project_root / "data"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def ocr_dir(self) -> Path:
        return self.data_dir / "ocr"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{self.data_dir / 'pixel_learning.sqlite3'}"


settings = Settings()
