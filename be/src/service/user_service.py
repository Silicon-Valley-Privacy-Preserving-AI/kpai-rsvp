from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.config.environments import STAFF_CODE
from src.model.user import User, UserRole
from src.model.seminar import Seminar
from src.model.seminar_rsvp import SeminarRSVP
from src.schema.user import UserCreateRequest, UserModifyRequest
from src.util.security import get_password_hash, verify_password

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, user_data: UserCreateRequest):
        if user_data.role == UserRole.STAFF:
            if not user_data.staff_code:
                raise HTTPException(
                    status_code=400,
                    detail="Staff code is required for staff registration"
                )
            if user_data.staff_code != STAFF_CODE:
                raise HTTPException(
                    status_code=403,
                    detail="Invalid staff code"
                )

        # Check if email already exists
        existing = await self.get_user_by_email(user_data.email)
        if existing:
            if existing.is_temporary:
                # Return 409 with temp user info so FE can show a confirmation modal
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "TEMP_ACCOUNT_EXISTS",
                        "username": existing.username,
                        "email": existing.email,
                    },
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        new_user = User(
            email=user_data.email,
            username=user_data.username,
            password=get_password_hash(user_data.password),
            role=user_data.role
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return new_user

    async def get_all_users(self) -> list[User]:
        result = await self.db.execute(select(User).order_by(User.created_at.desc()))
        return list(result.scalars().all())

    async def delete_user(self, user: User):
        await self.db.delete(user)
        await self.db.commit()
        return {"message": "User deleted successfully"}

    async def delete_user_by_id(self, user_id: int):
        """(Staff) Delete any user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        await self.db.delete(user)
        await self.db.commit()
        return {"message": "User deleted successfully"}

    async def get_user_by_email(self, email: str):
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def set_password_for_temp_user(self, email: str, new_password: str):
        """
        Converts a temporary (imported) account into a full account by setting a password.
        Returns the updated User so the caller can issue a JWT immediately.
        """
        from fastapi import HTTPException, status as http_status
        from src.util.security import get_password_hash

        user = await self.get_user_by_email(email)
        if user is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="No account found with this email",
            )
        if not user.is_temporary:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="This account already has a password set. Please log in normally.",
            )

        user.password = get_password_hash(new_password)
        user.is_temporary = False
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def modify_user(self, user: User, user_data: UserModifyRequest):
        if user_data.email is not None:
            existing = await self.get_user_by_email(user_data.email)
            if existing and existing.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email is already in use by another account.",
                )
            user.email = user_data.email

        if user_data.username is not None:
            user.username = user_data.username

        if user_data.new_password is not None:
            if not user_data.current_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to set a new password.",
                )
            if not user.password or not verify_password(user_data.current_password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect.",
                )
            user.password = get_password_hash(user_data.new_password)

        await self.db.commit()
        await self.db.refresh(user)

        return {"message": "Profile updated successfully"}

    async def get_my_seminar_history(self, user: User) -> list[dict]:
        result = await self.db.execute(
            select(SeminarRSVP, Seminar)
            .join(Seminar, SeminarRSVP.seminar_id == Seminar.id)
            .where(SeminarRSVP.user_id == user.id)
            .order_by(SeminarRSVP.created_at.desc())
        )
        rows = result.all()
        return [
            {
                "seminar_id": seminar.id,
                "seminar_title": seminar.title,
                "seminar_start_time": seminar.start_time,
                "seminar_end_time": seminar.end_time,
                "seminar_location": seminar.location,
                "seminar_host": seminar.host,
                "seminar_cover_image": seminar.cover_image,
                "checked_in": rsvp.checked_in,
                "checked_in_at": rsvp.checked_in_at,
                "rsvp_created_at": rsvp.created_at,
            }
            for rsvp, seminar in rows
        ]