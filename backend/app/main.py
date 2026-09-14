from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.database.session import engine, Base
import backend.app.database.models # Ensure models are loaded

# Routers
from backend.app.api.captures import router as captures_router
from backend.app.api.packets import router as packets_router
from backend.app.api.filters import router as filters_router
from backend.app.api.statistics import router as statistics_router
from backend.app.api.analysis import router as analysis_router
from backend.app.api.live import router as live_router
from backend.app.api.ws import router as ws_router
from backend.app.api.ai import router as ai_router
from backend.app.api.system import router as system_router
from backend.app.api.system import get_health

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TraceLens Network Analyzer database...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")
    yield
    logger.info("TraceLens Network Analyzer shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Professional offline network traffic analysis workstation with local Ollama AI copilot.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow local frontend during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health check
@app.get("/api/health")
async def health():
    return await get_health()

# Mount API routers
app.include_router(captures_router, prefix=settings.API_PREFIX)
app.include_router(packets_router, prefix=settings.API_PREFIX)
app.include_router(filters_router, prefix=settings.API_PREFIX)
app.include_router(statistics_router, prefix=settings.API_PREFIX)
app.include_router(analysis_router, prefix=settings.API_PREFIX)
app.include_router(live_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
app.include_router(system_router, prefix=settings.API_PREFIX)
app.include_router(ws_router)
app.include_router(ws_router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
