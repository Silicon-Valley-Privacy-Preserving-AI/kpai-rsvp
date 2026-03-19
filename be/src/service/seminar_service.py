import uuid
from datetime import datetime, UTC, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from src.model import User, SeminarRSVP, SeminarWaitlist, CheckInToken
from src.model.seminar import Seminar
from src.util.datetime_util import _ensure_utc
from src.schema.seminar import (
    SeminarCreateRequest,
    SeminarModifyRequest,
    CheckInTokenCreateRequest,
)


class SeminarService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Seminar CRUD ──────────────────────────────────────────────────────────

    async def create_seminar(self, seminar_data: SeminarCreateRequest):
        seminar = Seminar(
            title=seminar_data.title,
            description=seminar_data.description,
            start_time=seminar_data.start_time,
            end_time=seminar_data.end_time,
            location=seminar_data.location,
            max_capacity=seminar_data.max_capacity,
            host=seminar_data.host,
            cover_image=seminar_data.cover_image,
            rsvp_enabled=seminar_data.rsvp_enabled,
            waitlist_enabled=seminar_data.waitlist_enabled,
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
                selectinload(Seminar.rsvps).selectinload(SeminarRSVP.user),
                selectinload(Seminar.waitlist).selectinload(SeminarWaitlist.user),
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

        waitlist = [
            {
                "id": entry.user.id,
                "email": entry.user.email,
                "username": entry.user.username,
                "position": idx + 1,
                "joined_at": entry.created_at,
            }
            for idx, entry in enumerate(seminar.waitlist)
        ]

        return {
            "id": seminar.id,
            "created_at": seminar.created_at,
            "title": seminar.title,
            "description": seminar.description,
            "start_time": seminar.start_time,
            "end_time": seminar.end_time,
            "location": seminar.location,
            "max_capacity": seminar.max_capacity,
            "host": seminar.host,
            "cover_image": seminar.cover_image,
            "rsvp_enabled": seminar.rsvp_enabled,
            "waitlist_enabled": seminar.waitlist_enabled,
            "current_rsvp_count": len(users),
            "waitlist_count": len(waitlist),
            "users": users,
            "waitlist": waitlist,
        }

    async def get_seminars(self):
        result = await self.db.execute(select(Seminar))
        return result.scalars().all()

    async def modify_seminar(self, seminar: Seminar, seminar_data: SeminarModifyRequest):
        for field in seminar_data.model_fields:
            value = getattr(seminar_data, field)
            if value is not None:
                setattr(seminar, field, value)
        await self.db.commit()
        await self.db.refresh(seminar)
        return {"message": "Seminar modified successfully"}

    # ── RSVP & Waitlist ───────────────────────────────────────────────────────

    async def rsvp(self, seminar: Seminar, user: User):
        if not seminar.rsvp_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RSVP is not enabled for this seminar",
            )

        existing_rsvp = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == user.id,
            )
        )
        if existing_rsvp.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already RSVP'd")

        existing_waitlist = await self.db.execute(
            select(SeminarWaitlist).where(
                SeminarWaitlist.seminar_id == seminar.id,
                SeminarWaitlist.user_id == user.id,
            )
        )
        if existing_waitlist.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already on waitlist")

        # Capacity check (None = unlimited)
        if seminar.max_capacity is not None:
            count_result = await self.db.execute(
                select(func.count())
                .select_from(SeminarRSVP)
                .where(SeminarRSVP.seminar_id == seminar.id)
            )
            rsvp_count = count_result.scalar_one()

            if rsvp_count >= seminar.max_capacity:
                if seminar.waitlist_enabled:
                    entry = SeminarWaitlist(user_id=user.id, seminar_id=seminar.id)
                    self.db.add(entry)
                    await self.db.commit()

                    pos_result = await self.db.execute(
                        select(func.count())
                        .select_from(SeminarWaitlist)
                        .where(SeminarWaitlist.seminar_id == seminar.id)
                    )
                    position = pos_result.scalar_one()
                    return {"message": "Added to waitlist", "waitlisted": True, "position": position}

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Seminar is full",
                )

        rsvp = SeminarRSVP(user_id=user.id, seminar_id=seminar.id)
        self.db.add(rsvp)
        await self.db.commit()
        return {"message": "RSVP successful", "waitlisted": False}

    async def cancel_rsvp(self, seminar: Seminar, user: User):
        result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == user.id,
            )
        )
        rsvp = result.scalar_one_or_none()
        if rsvp is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSVP not found")

        await self.db.delete(rsvp)
        await self.db.flush()

        # FIFO: promote first person on waitlist
        if seminar.waitlist_enabled:
            next_result = await self.db.execute(
                select(SeminarWaitlist)
                .where(SeminarWaitlist.seminar_id == seminar.id)
                .order_by(SeminarWaitlist.created_at.asc())
                .limit(1)
            )
            next_entry = next_result.scalar_one_or_none()
            if next_entry:
                new_rsvp = SeminarRSVP(user_id=next_entry.user_id, seminar_id=seminar.id)
                self.db.add(new_rsvp)
                await self.db.delete(next_entry)

        await self.db.commit()
        return {"message": "RSVP cancelled"}

    async def cancel_waitlist(self, seminar: Seminar, user: User):
        result = await self.db.execute(
            select(SeminarWaitlist).where(
                SeminarWaitlist.seminar_id == seminar.id,
                SeminarWaitlist.user_id == user.id,
            )
        )
        entry = result.scalar_one_or_none()
        if entry is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")

        await self.db.delete(entry)
        await self.db.commit()
        return {"message": "Removed from waitlist"}

    # ── Check-in token ────────────────────────────────────────────────────────

    async def create_checkin_token(
        self, seminar: Seminar, data: CheckInTokenCreateRequest, staff_user: User
    ):
        # Deactivate any existing active tokens for this seminar
        existing = await self.db.execute(
            select(CheckInToken).where(
                CheckInToken.seminar_id == seminar.id,
                CheckInToken.is_active == True,
            )
        )
        for token in existing.scalars():
            token.is_active = False

        token_str = str(uuid.uuid4())
        expires_at = datetime.now(UTC) + timedelta(minutes=data.duration_minutes)

        checkin_token = CheckInToken(
            seminar_id=seminar.id,
            token=token_str,
            expires_at=expires_at,
            is_active=True,
            created_by_id=staff_user.id,
        )
        self.db.add(checkin_token)
        await self.db.commit()
        await self.db.refresh(checkin_token)
        return checkin_token

    async def get_active_checkin_token(self, seminar: Seminar):
        result = await self.db.execute(
            select(CheckInToken).where(
                CheckInToken.seminar_id == seminar.id,
                CheckInToken.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def stop_checkin(self, seminar: Seminar):
        result = await self.db.execute(
            select(CheckInToken).where(
                CheckInToken.seminar_id == seminar.id,
                CheckInToken.is_active == True,
            )
        )
        tokens = result.scalars().all()
        for token in tokens:
            token.is_active = False
        await self.db.commit()
        return {"message": "Check-in stopped"}

    async def checkin_with_token(self, token_str: str, user: User):
        token_result = await self.db.execute(
            select(CheckInToken).where(CheckInToken.token == token_str)
        )
        token = token_result.scalar_one_or_none()

        if token is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid check-in token")
        if not token.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Check-in is closed")
        if _ensure_utc(token.expires_at) < datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Check-in token has expired")

        rsvp_result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == token.seminar_id,
                SeminarRSVP.user_id == user.id,
            )
        )
        rsvp = rsvp_result.scalar_one_or_none()

        if rsvp is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not RSVP'd for this seminar",
            )
        if rsvp.checked_in:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in")

        rsvp.checked_in = True
        rsvp.checked_in_at = datetime.now(UTC)
        await self.db.commit()
        return {"message": "Check-in successful", "seminar_id": token.seminar_id}

    # ── Staff: modify individual user check-in ────────────────────────────────

    async def modify_user_checkin(self, seminar: Seminar, target_user_id: int, checked_in: bool):
        result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == target_user_id,
            )
        )
        rsvp = result.scalar_one_or_none()
        if rsvp is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSVP not found")

        rsvp.checked_in = checked_in
        rsvp.checked_in_at = datetime.now(UTC) if checked_in else None
        await self.db.commit()
        return {"message": "Check-in status updated"}

    # ── Legacy direct check-in (kept for compatibility) ───────────────────────

    async def check_in(self, seminar: Seminar, user: User):
        result = await self.db.execute(
            select(SeminarRSVP).where(
                SeminarRSVP.seminar_id == seminar.id,
                SeminarRSVP.user_id == user.id,
            )
        )
        rsvp = result.scalar_one_or_none()
        if rsvp is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSVP not found")
        if rsvp.checked_in:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in")

        rsvp.checked_in = True
        rsvp.checked_in_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(rsvp)
        return {"message": "Check-in successful"}
