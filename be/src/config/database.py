from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os

# PostgreSQL async connection URL.
# Format: postgresql+asyncpg://<user>:<password>@<host>:<port>/<dbname>
# Defaults to a local dev instance; override via the DATABASE_URL env var.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://svain:svainpassword@localhost:5432/svain",
)

engine = create_async_engine(DATABASE_URL, echo=False)

# Session factory
async_session = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


# Dependency injection helper
async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
