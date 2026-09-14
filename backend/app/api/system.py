from pathlib import Path
from fastapi import APIRouter
from backend.app.core.detector import detector
from backend.app.core.config import LOGS_DIR
from backend.app.ai.ollama_client import ollama_client

router = APIRouter(prefix="/system", tags=["System & Health"])

@router.get("/status")
def get_system_status():
    return detector.detect_all()

@router.get("/health")
async def get_health():
    diag = detector.detect_all()
    ollama_health = await ollama_client.check_health()
    return {
        "backend": "ok",
        "database": "ok",
        "packet_engine": "ok" if diag["capabilities"]["pcap_analysis_ready"] else "degraded",
        "live_capture": "ok" if diag["capabilities"]["live_capture_ready"] else "unavailable",
        "ollama": "ok" if ollama_health.get("connected") else "offline"
    }

@router.get("/logs")
def get_system_logs(lines: int = 100):
    log_file = LOGS_DIR / "tracelens.log"
    if not log_file.exists():
        return {"logs": []}

    try:
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
            return {"logs": [l.strip() for l in all_lines[-lines:]]}
    except Exception as e:
        return {"logs": [f"Error reading logs: {str(e)}"]}
