from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from src.schema.user import UserResponse


class SeminarCreateRequest(BaseModel):
    title: str
    description: str
    maximum_rsvp_count: int


class SeminarModifyRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    maximum_rsvp_count: Optional[int] = None


class SeminarResponse(BaseModel):
    id: int
    title: str
    description: str
    maximum_rsvp_count: int

    class Config:
        from_attributes = True


class SeminarUserResponse(BaseModel):
    id: int
    email: str
    username: str
    checked_in: bool
    checked_in_at: datetime | None


class SeminarDetailResponse(BaseModel):
    id: int
    title: str
    description: str
    maximum_rsvp_count: int
    current_rsvp_count: int
    users: list[SeminarUserResponse]

    class Config:
        from_attributes = True