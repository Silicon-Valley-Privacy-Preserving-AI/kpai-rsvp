from fastapi import APIRouter, Depends

from src.config.database import get_db
from src.model import User
from src.route.v1.user import get_current_user
from src.service.seminar_service import SeminarService
from src.schema.seminar import CheckInRequest
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/check-in", tags=["Check-in"])


async def get_seminar_service(db: AsyncSession = Depends(get_db)):
    return SeminarService(db)


@router.post("", summary="Check in via token link")
async def checkin_with_token(
    body: CheckInRequest,
    current_user: User = Depends(get_current_user),
    seminar_service: SeminarService = Depends(get_seminar_service),
):
    return await seminar_service.checkin_with_token(body.token, current_user)
