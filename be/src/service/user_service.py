from fastapi import HTTPException
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

    async def delete_user(self, user: User):
        await self.db.delete(user)
        await self.db.commit()
        return {"message": "User deleted successfully"}

    async def get_user_by_email(self, email: str):
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def modify_user(self, user: User, user_data: UserModifyRequest):
        if user_data.email is not None:
            user.email = user_data.email

        if user_data.username is not None:
            user.username = user_data.username

        await self.db.commit()
        await self.db.refresh(user)

        return {"message": "User modified successfully"}