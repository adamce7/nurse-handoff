"""
main.py
-------
FastAPI application entry point.

Currently contains only the app setup and a /health endpoint.
Routes will be added in the next phase (shift, notes, summary, handoff).

To run (from the api/ directory):
    uvicorn main:app --reload --port 8000

Or from the nurse-handoff/ parent directory:
    uvicorn api.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.shift   import router as shift_router
from app.routes.notes   import router as notes_router
from app.routes.summary import router as summary_router
from app.routes.handoff import router as handoff_router


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown events
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify data files exist and settings loaded correctly
    if not settings.patients_file.exists():
        raise RuntimeError(
            f"patients.json not found at {settings.patients_file}. "
            "Ensure api/data/patients.json exists before starting the server."
        )
    if not settings.store_file.exists():
        raise RuntimeError(
            f"runtime_store.json not found at {settings.store_file}. "
            "Ensure api/data/runtime_store.json exists before starting the server."
        )
    print(f"[NurseSync] Model: {settings.model_name} | Temperature: {settings.temperature}")
    print(f"[NurseSync] Data store: {settings.store_file}")
    yield
    # Shutdown: nothing to close for the PoC JSON store


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NurseSync Handoff API",
    description=(
        "AI-powered nurse shift handoff documentation service. "
        "Generates structured SBAR summaries using GPT-4o."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allows the React frontend (localhost:5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check — always available, used by Postman and monitoring
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health_check():
    """
    Returns server status and current timestamp.
    Safe to call without authentication — used by load balancers and dashboards.
    """
    return {
        "status": "ok",
        "service": "NurseSync Handoff API",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": settings.model_name,
    }


# ---------------------------------------------------------------------------
# Entry point — allows `python main.py` to start the server directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(shift_router,   prefix="/shift",   tags=["Shift"])
app.include_router(notes_router,   prefix="/notes",   tags=["Notes"])
app.include_router(summary_router, prefix="/summary", tags=["Summary"])
app.include_router(handoff_router, prefix="/handoff", tags=["Handoff"])
