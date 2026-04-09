from fastapi import FastAPI
from contextlib import asynccontextmanager
from sqlalchemy import text
from src.config.database import engine, Base


@asynccontextmanager
async def lifespan(application: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    print("App starting up...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("DB tables ready.")

    # Additive schema migrations.
    # PostgreSQL supports "ADD COLUMN IF NOT EXISTS" natively, so no try/except needed.
    _migrations = [
        "ALTER TABLE seminars ADD COLUMN IF NOT EXISTS display_timezone TEXT",
    ]
    async with engine.begin() as conn:
        for stmt in _migrations:
            await conn.execute(text(stmt))

    yield
    # ── Shutdown ──────────────────────────────────────────────────────────────
    print("App shutting down...")
