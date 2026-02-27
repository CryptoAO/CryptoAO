"""Vercel serverless entry point for the SAFELEARN FastAPI app."""

from src.backend.app.main import app

# Vercel's Python runtime auto-detects the ASGI `app` object
