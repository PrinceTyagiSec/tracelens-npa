import os
from pathlib import Path
from pydantic import BaseModel

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CAPTURES_DIR = BASE_DIR / "captures"
EXPORTS_DIR = BASE_DIR / "exports"
LOGS_DIR = BASE_DIR / "logs"

CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "TraceLens Network Analyzer"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR.as_posix()}/tracelens.db"
    
    # AI Engine
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    DEFAULT_AI_MODEL: str = os.getenv("AI_MODEL", "llama3.1:8b")
    AI_TEMPERATURE: float = 0.2
    
    # Capture & Parsing
    MAX_UPLOAD_SIZE_MB: int = 250
    DEFAULT_SNAPLEN: int = 65535
    DEFAULT_MAX_PACKETS_STREAM: int = 50000
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

settings = Settings()
