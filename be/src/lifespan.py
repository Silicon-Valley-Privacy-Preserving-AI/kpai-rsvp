from fastapi import FastAPI
from contextlib import asynccontextmanager
from sqlalchemy import text
from src.config.database import engine, Base


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup logic
    print("App starting up...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Creating db tables...")

    # Additive schema migrations for existing databases.
    # SQLite does not support IF NOT EXISTS in ALTER TABLE, so we catch the
    # OperationalError that occurs when the column already exists.
    _migrations = [
        "ALTER TABLE seminars ADD COLUMN display_timezone TEXT",
    ]
    async with engine.begin() as conn:
        for stmt in _migrations:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # column already exists — safe to ignore

    yield
    # Shutdown logic
    print("App shutting down...")