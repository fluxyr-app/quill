"""Application configuration."""
import os


class Config:
    """Base config. Defaults to a local SQLite database for zero-setup runs."""

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///quill_app.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
