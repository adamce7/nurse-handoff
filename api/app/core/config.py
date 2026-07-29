from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# Resolve the api/ root directory (two levels up from this file)
API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=API_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenAI
    openai_api_key: str
    model_name: str = "gpt-4o"
    temperature: float = 0.2
    max_tokens: int = 700
    max_retries: int = 2

    # Data store paths (JSON files that emulate the database)
    patients_file: Path = API_ROOT / "data" / "patients.json"
    store_file: Path = API_ROOT / "data" / "runtime_store.json"


settings = Settings()
