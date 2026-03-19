from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.model import User
from src.model.user import UserRole
from src.route.v1.user import get_current_user
from src.service.seminar_service import SeminarService
from src.schema.seminar import (
    SeminarCreateRequest,
    SeminarModifyRequest,
    SeminarResponse,
    SeminarDetailResponse,
    CheckInTokenCreateRequest,
    CheckInTokenResponse,
    ModifyUserCheckInRequest,
)

router = APIRouter(prefix="/seminars", tags=["Seminar"])


async def get_seminar_service(db: AsyncSession = Depends(get_db)):
    return SeminarService(db)


async def get_current_staff(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.STAFF:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")
    return current_user


# ── Seminar CRUD ──────────────────────────────────────────────────────────────

@router.get("", summary="Get seminar list", response_model=list[SeminarResponse])
async def get_seminars(seminar_service: SeminarService = Depends(get_seminar_service)):
    return await seminar_service.get_seminars()


@router.get("/{seminar_id}", summary="Get seminar detail", response_model=SeminarDetailResponse)
async def get_seminar(
    seminar_id: int,
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_detail(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return seminar


@router.post(
    "",
    summary="(Staff) Create seminar",
    response_model=SeminarResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_seminar(
    seminar_data: SeminarCreateRequest,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    return await seminar_service.create_seminar(seminar_data)


@router.put("/{seminar_id}", summary="(Staff) Modify seminar")
async def modify_seminar(
    seminar_id: int,
    seminar_data: SeminarModifyRequest,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.modify_seminar(seminar, seminar_data)


@router.delete("/{seminar_id}", summary="(Staff) Delete seminar")
async def delete_seminar(
    seminar_id: int,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.delete_seminar(seminar)


# ── RSVP & Waitlist ───────────────────────────────────────────────────────────

@router.post("/{seminar_id}/rsvp", summary="RSVP (or join waitlist if full)")
async def rsvp_seminar(
    seminar_id: int,
    current_user: User = Depends(get_current_user),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.rsvp(seminar, current_user)


@router.delete("/{seminar_id}/rsvp", summary="Cancel RSVP (auto-promotes waitlist via FIFO)")
async def cancel_rsvp_seminar(
    seminar_id: int,
    current_user: User = Depends(get_current_user),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.cancel_rsvp(seminar, current_user)


@router.delete("/{seminar_id}/waitlist", summary="Cancel waitlist registration")
async def cancel_waitlist(
    seminar_id: int,
    current_user: User = Depends(get_current_user),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.cancel_waitlist(seminar, current_user)


# ── Check-in token (Staff) ────────────────────────────────────────────────────

@router.post(
    "/{seminar_id}/checkin-token",
    summary="(Staff) Create check-in token",
    response_model=CheckInTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_checkin_token(
    seminar_id: int,
    data: CheckInTokenCreateRequest,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.create_checkin_token(seminar, data, staff_user)


@router.get(
    "/{seminar_id}/checkin-token",
    summary="(Staff) Get active check-in token",
    response_model=CheckInTokenResponse,
)
async def get_checkin_token(
    seminar_id: int,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    token = await seminar_service.get_active_checkin_token(seminar)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active check-in token")
    return token


@router.delete("/{seminar_id}/checkin-token", summary="(Staff) Stop check-in")
async def stop_checkin(
    seminar_id: int,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.stop_checkin(seminar)


# ── Staff: modify individual user check-in status ─────────────────────────────

@router.patch(
    "/{seminar_id}/users/{user_id}/checkin",
    summary="(Staff) Modify a user's check-in status",
)
async def modify_user_checkin(
    seminar_id: int,
    user_id: int,
    body: ModifyUserCheckInRequest,
    staff_user: User = Depends(get_current_staff),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.modify_user_checkin(seminar, user_id, body.checked_in)


# ── Legacy direct check-in (kept for compatibility) ───────────────────────────

@router.post("/{seminar_id}/check-in", summary="Check in for seminar (direct, legacy)")
async def check_in_seminar(
    seminar_id: int,
    current_user: User = Depends(get_current_user),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    seminar = await seminar_service.get_seminar_by_id(seminar_id)
    if seminar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return await seminar_service.check_in(seminar, current_user)
