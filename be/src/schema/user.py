from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from src.model.user import UserRole


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, description="Name of user")
    email: str = Field(..., description="Email of user")
    password: str = Field(..., min_length=4, description="Password of user")
    role: UserRole = Field(..., description="User role (member or staff)")
    staff_code: Optional[str] = None


class UserModifyRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_temporary: bool = False


class SetPasswordRequest(BaseModel):
    email: str = Field(..., description="Email of the temporary account")
    new_password: str = Field(..., min_length=4, description="New password to set")


class UserAdminResponse(BaseModel):
    id: int
    created_at: datetime
    email: str
    username: str
    role: str
    is_temporary: bool
    full_member_email_sent: bool

    class Config:
        from_attributes = True