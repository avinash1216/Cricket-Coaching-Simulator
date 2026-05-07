"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration for the Cricket Coach backend."""

    # GCP Project
    GCP_PROJECT: str = os.getenv("GCP_PROJECT", "cricket-coach-mvp")

    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Firestore
    FIRESTORE_DATABASE: str = os.getenv("FIRESTORE_DATABASE", "(default)")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))

    # Decision Window
    DECISION_WINDOW_SECONDS: int = int(os.getenv("DECISION_WINDOW_SECONDS", "25"))

    # Match Simulator
    BALL_INTERVAL_SECONDS: float = float(os.getenv("BALL_INTERVAL_SECONDS", "5"))
    OVER_PAUSE_SECONDS: float = float(os.getenv("OVER_PAUSE_SECONDS", "8"))

    # CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,https://cricket-coach-mvp.web.app"
    ).split(",")


settings = Settings()
