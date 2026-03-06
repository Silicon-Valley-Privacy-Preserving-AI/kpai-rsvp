from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.model.user import User
from src.model.seminar import Seminar
from src.model.seminar_rsvp import SeminarRSVP

class SystemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def healthcheck(self):
        return {"message": "yes"}

    async def get_users(self):
        result = await self.db.execute(select(User))
        return result.scalars().all()

    async def get_seminars(self):
        result = await self.db.execute(select(Seminar))
        return result.scalars().all()

    async def get_seminarRSVPs(self):
        result = await self.db.execute(select(SeminarRSVP))
        return result.scalars().all()