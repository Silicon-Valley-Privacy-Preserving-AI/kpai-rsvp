from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from src.model.user import UserRole
from src.util.datetime_util import UTCDatetime, OptionalUTCDatetime


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, description="Name of user")
    email: str = Field(..., description="Email of user")
    password: str = Field(..., min_length=4, description="Password of user")
    role: UserRole = Field(..., description="User role (member or staff)")
    staff_code: Optional[str] = None


class UserModifyRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=4)


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


class MyProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_temporary: bool
    full_member_email_sent: bool
    created_at: UTCDatetime

    class Config:
        from_attributes = True


class SeminarHistoryItem(BaseModel):
    seminar_id: int
    seminar_title: str
    seminar_start_time: OptionalUTCDatetime
    seminar_end_time: OptionalUTCDatetime
    seminar_location: Optional[str]
    seminar_host: Optional[str]
    seminar_cover_image: Optional[str]
    checked_in: bool
    checked_in_at: OptionalUTCDatetime
    rsvp_created_at: UTCDatetime