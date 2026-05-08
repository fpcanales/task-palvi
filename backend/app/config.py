from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://palvi:palvi@db:5432/palvi"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    jwt_secret: str  # no default — pydantic-settings fails at boot if missing
    jwt_expire_hours: int = 24
    jwt_algorithm: str = "HS256"


settings = Settings()
