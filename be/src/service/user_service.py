from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.config.environments import STAFF_CODE
from src.model.user import User, UserRole
from src.schema.user import UserCreateRequest, UserModifyRequest
from src.util.security import get_password_hash

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
            user.email = user_data.email

        if user_data.username is not None:
            user.username = user_data.username

        await self.db.commit()
        await self.db.refresh(user)

        return {"message": "User modified successfully"}