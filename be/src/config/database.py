from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os

DATA_FOLDER_NAME = "data"
DB_FILE_NAME = "kpai.db"

# Data 폴더 생성
os.makedirs(f"{DATA_FOLDER_NAME}", exist_ok=True)

# SQLite 비동기 URL 설정
DATABASE_URL = f"sqlite+aiosqlite:///./{DATA_FOLDER_NAME}/{DB_FILE_NAME}"

# 엔진 생성
engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# 세션 팩토리 생성
async_session = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

# 베이스 모델 클래스
class Base(DeclarativeBase):
    pass

# Dependency injection을 위한 세션 생성기
async def get_db():
    async with async_session() as session:
        yield session