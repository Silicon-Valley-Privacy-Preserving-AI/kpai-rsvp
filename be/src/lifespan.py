from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.config.database import engine, Base


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup logic
    print("App starting up...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Creating db tables...")

    yield
    # Shutdown logic
    print("App shutting down...")