from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://palvi:palvi@db:5432/palvi"
    # In prod, override via env: CORS_ORIGINS="https://palvi.example.cl,https://www.palvi.example.cl"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    jwt_secret: str  # no default — pydantic-settings fails at boot if missing
    jwt_expire_hours: int = 24
    jwt_algorithm: str = "HS256"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, v: Any) -> Any:
        # Accept a CSV string from env and turn it into a list. Lists pass through.
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


settings = Settings()
