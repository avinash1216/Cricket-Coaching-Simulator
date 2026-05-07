"""Cricket Coaching Simulator — FastAPI Backend Entry Point."""

from __future__ import annotations

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import match, decisions, leaderboard, admin, ws

# ── Logging ────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# ── App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="🏏 Cricket Coaching Simulator",
    description="Real-time fan engagement platform — be the virtual coach!",
    version="0.1.0",
)

# ── CORS ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────

app.include_router(match.router)
app.include_router(decisions.router)
app.include_router(leaderboard.router)
app.include_router(admin.router)
app.include_router(ws.router)


# ── Health Check ───────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "Cricket Coaching Simulator API",
        "status": "healthy",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    """Health check for Cloud Run."""
    return {"status": "ok"}


# ── Startup / Shutdown ─────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info("🏏 Cricket Coaching Simulator API starting up...")
    logger.info("CORS origins: %s", settings.CORS_ORIGINS)
    logger.info("Gemini model: %s", settings.GEMINI_MODEL)
    logger.info("Decision window: %ds", settings.DECISION_WINDOW_SECONDS)


@app.on_event("shutdown")
async def shutdown():
    logger.info("🏏 Cricket Coaching Simulator API shutting down...")


# ── Run with uvicorn ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
