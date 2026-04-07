import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


def _parse_allowed_origins(raw_value: str) -> list[str]:
    cleaned = (raw_value or "*").strip()
    if cleaned == "*":
        return ["*"]

    origins = [origin.strip() for origin in cleaned.split(",") if origin.strip()]
    return origins or ["*"]


def _parse_positive_int(raw_value: str, default_value: int) -> int:
    try:
        value = int((raw_value or "").strip())
        return value if value > 0 else default_value
    except Exception:
        return default_value


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    allowed_origins: list[str]
    max_upload_mb: int
    log_level: str
    mongo_uri: str
    mongo_database: str
    mongo_collection: str
    mongo_analysis_id_field: str


settings = Settings(
    app_name=os.getenv("APP_NAME", "Tender Compliance API"),
    app_version=os.getenv("APP_VERSION", "1.0.0"),
    allowed_origins=_parse_allowed_origins(os.getenv("ALLOWED_ORIGINS", "*")),
    max_upload_mb=_parse_positive_int(os.getenv("MAX_UPLOAD_MB", "20"), 20),
    log_level=(os.getenv("LOG_LEVEL", "INFO")).upper(),
    mongo_uri=os.getenv("MONGO_URI", "mongodb://localhost:27017"),
    mongo_database=os.getenv("MONGO_DATABASE", "tender_compliance"),
    mongo_collection=os.getenv("MONGO_COLLECTION", "analyses"),
    mongo_analysis_id_field=os.getenv("MONGO_ANALYSIS_ID_FIELD", "analysis_id"),
)
