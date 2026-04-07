from typing import Optional
from pydantic import BaseModel, HttpUrl

from src.util.datetime_util import UTCDatetime, OptionalUTCDatetime


# ── Luma import ───────────────────────────────────────────────────────────────

class LumaPreviewRequest(BaseModel):
    url: str   # e.g. "https://lu.ma/9xuuhnpq"


class LumaPreviewResponse(BaseModel):
    """
    Pre-filled seminar fields extracted from a Luma event page.
    All fields are Optional — partial extraction is acceptable.
    The caller (staff) must review and submit via the normal Create endpoint.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None   # ISO 8601 UTC string, e.g. "2026-04-10T18:00:00Z"
    end_time: Optional[str] = None
    location: Optional[str] = None
    host: Optional[str] = None
    cover_image: Optional[str] = None
    # Extraction metadata
    source_url: str
    extracted_fields: list[str]        # which fields were successfully extracted
    warnings: list[str]                # e.g. "capacity not found", "description was HTML-converted"


# ── Seminar CRUD (Request) ────────────────────────────────────────────────────
# 요청 스키마: FE가 UTC ISO 문자열로 전송하므로 UTCDatetime으로 받아 naive 방지

class SeminarCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: Optional[UTCDatetime] = None
    end_time: Optional[UTCDatetime] = None
    location: Optional[str] = None
    max_capacity: Optional[int] = None
    host: Optional[str] = None
    cover_image: Optional[str] = None
    rsvp_enabled: bool = True
    waitlist_enabled: bool = False


class SeminarModifyRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[UTCDatetime] = None
    end_time: Optional[UTCDatetime] = None
    location: Optional[str] = None
    max_capacity: Optional[int] = None
    host: Optional[str] = None
    cover_image: Optional[str] = None
    rsvp_enabled: Optional[bool] = None
    waitlist_enabled: Optional[bool] = None


# ── Seminar Response ──────────────────────────────────────────────────────────
# 응답 스키마: UTCDatetime → SQLite가 반환한 naive datetime에 UTC tzinfo 자동 부착
# → Pydantic이 "+00:00" 포함 ISO 문자열로 직렬화 → FE JS가 정확히 UTC로 해석

class SeminarResponse(BaseModel):
    id: int
    created_at: UTCDatetime
    title: str
    description: Optional[str]
    start_time: OptionalUTCDatetime
    end_time: OptionalUTCDatetime
    location: Optional[str]
    max_capacity: Optional[int]
    host: Optional[str]
    cover_image: Optional[str]
    rsvp_enabled: bool
    waitlist_enabled: bool

    class Config:
        from_attributes = True


# ── RSVP / Waitlist user detail ───────────────────────────────────────────────

class SeminarUserResponse(BaseModel):
    id: int
    email: str
    username: str
    checked_in: bool
    checked_in_at: OptionalUTCDatetime


class SeminarWaitlistUserResponse(BaseModel):
    id: int
    email: str
    username: str
    position: int
    joined_at: UTCDatetime


class SeminarDetailResponse(BaseModel):
    id: int
    created_at: UTCDatetime
    title: str
    description: Optional[str]
    start_time: OptionalUTCDatetime
    end_time: OptionalUTCDatetime
    location: Optional[str]
    max_capacity: Optional[int]
    host: Optional[str]
    cover_image: Optional[str]
    rsvp_enabled: bool
    waitlist_enabled: bool
    current_rsvp_count: int
    waitlist_count: int
    users: list[SeminarUserResponse]
    waitlist: list[SeminarWaitlistUserResponse]

    class Config:
        from_attributes = True


# ── Check-in token ────────────────────────────────────────────────────────────

class CheckInTokenCreateRequest(BaseModel):
    duration_minutes: int = 60


class CheckInTokenResponse(BaseModel):
    id: int
    seminar_id: int
    token: str
    expires_at: UTCDatetime
    is_active: bool

    class Config:
        from_attributes = True


# ── Token-based check-in ──────────────────────────────────────────────────────

class CheckInRequest(BaseModel):
    token: str


# ── Staff: modify individual user check-in ────────────────────────────────────

class ModifyUserCheckInRequest(BaseModel):
    checked_in: bool
