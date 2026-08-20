import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/")
def root():
    return {
        "message": "Smartify Local API is running",
        "model": settings.OLLAMA_MODEL,
        "private": True,
    }


@router.get("/health")
def health():
    ollama_url = settings.OLLAMA_BASE_URL.removesuffix("/v1")

    try:
        response = httpx.get(f"{ollama_url}/api/tags", timeout=2.0)
        response.raise_for_status()
        installed_models = {
            model.get("name") for model in response.json().get("models", [])
        }
        ollama_ready = settings.OLLAMA_MODEL in installed_models
    except (httpx.HTTPError, ValueError):
        ollama_ready = False

    return {
        "api": "ready",
        "ollama": "ready" if ollama_ready else "unavailable",
        "model": settings.OLLAMA_MODEL,
    }


@router.get("/hello")
def say_hello():
    return {"message": "Hello from Smartify"}


@router.get("/database-test")
def test_database(database: Session = Depends(get_db)):
    database.execute(text("SELECT 1"))

    return {
        "message": "Database connection successful",
        "database": "local SQLite",
    }
