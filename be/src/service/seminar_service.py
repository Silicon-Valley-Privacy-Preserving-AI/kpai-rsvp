from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from src.model import User, SeminarRSVP
from src.model.seminar import Seminar
from src.schema.seminar import SeminarCreateRequest, SeminarModifyRequest
from datetime import datetime, UTC


class SeminarService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_seminar(self, seminar_data: SeminarCreateRequest):
        seminar = Seminar(
            title=seminar_data.title,
            description=seminar_data.description,
            maximum_rsvp_count=seminar_data.maximum_rsvp_count,
        )
        self.db.add(seminar)
        await self.db.commit()
        await self.db.refresh(seminar)
        return seminar

    async def delete_seminar(self, seminar: Seminar):
        await self.db.delete(seminar)
        await self.db.commit()
        return {"message": "Seminar deleted successfully"}

    async def get_seminar_by_id(self, seminar_id: int):
        result = await self.db.execute(select(Seminar).where(Seminar.id == seminar_id))
        return result.scalar_one_or_none()

    async def get_seminar_detail(self, seminar_id: int):
        result = await self.db.execute(
            select(Seminar)
            .where(Seminar.id == seminar_id)
            .options(
                selectinload(Seminar.rsvps)
                .selectinload(SeminarRSVP.user)
            )
        )

        seminar = result.scalar_one_or_none()
        if seminar is None:
            return None

        users = [
            {
                "id": rsvp.user.id,
                "email": rsvp.user.email,
                "username": rsvp.user.username,
                "checked_in": rsvp.checked_in,
                "checked_in_at": rsvp.checked_in_at,
            }
            for rsvp in seminar.rsvps
        ]

        return {
            "id": seminar.id,
            "title": seminar.title,
            "description": seminar.description,
            "maximum_rsvp_count": seminar.maximum_rsvp_count,
            "current_rsvp_count": len(users),
            "users": users,
        }

    async def get_seminars(self):
        result = await self.db.execute(select(Seminar))
        return result.scalars().all()

    async def modify_seminar(self, seminar: Seminar, seminar_data: SeminarModifyRequest):
        if seminar_data.title is not None:
            seminar.title = seminar_data.title

        if seminar_data.description is not None:
            seminar.description = seminar_data.description

        if seminar_data.maximum_rsvp_count is not None:
            seminar.maximum_rsvp_count = seminar_data.maximum_rsvp_count

        await self.db.commit()
        await self.db.refresh(seminar)

        return {"message": "Seminar modified successfully"}

    async def rsvp(self, seminar: Seminar, user: User):
        # 1. 이미 RSVP 했는지 체크
        result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == user.id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already RSVP'd"
            )

        # 2. 정원 체크
        count_result = await self.db.execute(
            select(func.count())
            .select_from(SeminarRSVP)
            .where(SeminarRSVP.seminar_id == seminar.id)
        )
        rsvp_count = count_result.scalar_one()

        if rsvp_count >= seminar.maximum_rsvp_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seminar is full"
            )

        # 3. RSVP 생성
        rsvp = SeminarRSVP(
            user_id=user.id,
            seminar_id=seminar.id
        )
        self.db.add(rsvp)
        await self.db.commit()

        return {"message": "RSVP successful"}

    async def cancel_rsvp(self, seminar: Seminar, user: User):
        result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == user.id
            )
        )
        rsvp = result.scalar_one_or_none()

        if rsvp is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSVP not found"
            )

        await self.db.delete(rsvp)
        await self.db.commit()

        return {"message": "RSVP cancelled"}

    async def check_in(self, seminar: Seminar, user: User):
        result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == user.id
            )
        )
        rsvp = result.scalar_one_or_none()

        if rsvp is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSVP not found"
            )

        if rsvp.checked_in:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already checked in"
            )

        rsvp.checked_in = True
        rsvp.checked_in_at = datetime.now(UTC)

        await self.db.commit()
        await self.db.refresh(rsvp)

        return {"message": "Check-in successful"}