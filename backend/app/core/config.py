import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    """Keep personal data on this Mac, never in a hosted database."""
    configured_data_dir = os.environ.get("SMARTIFY_DATA_DIR")
    data_dir = (
        Path(configured_data_dir).expanduser()
        if configured_data_dir
        else Path(__file__).resolve().parents[2] / "data"
    )
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'smartify.db'}"


class Settings(BaseSettings):
    DATABASE_URL: str = Field(default_factory=_default_database_url)

    # Ollama exposes an OpenAI-compatible endpoint entirely on localhost.
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434/v1"
    OLLAMA_MODEL: str = "gemma4:26b"
    EXPLANATION_MODEL: str = "gemma4:26b"
    QUIZ_MODEL: str = "gemma4:26b"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
