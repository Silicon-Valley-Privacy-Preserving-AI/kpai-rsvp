from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.model.user import User, UserRole
from src.route.v1.user import get_current_user
from src.service.import_service import ImportService

router = APIRouter(prefix="/import", tags=["Import"])


async def get_import_service(db: AsyncSession = Depends(get_db)) -> ImportService:
    return ImportService(db)


@router.post(
    "/{seminar_id}",
    summary="(Staff) Import attendees from CSV",
    description=(
        "Upload a CSV file exported from Luma (or matching the example.csv schema). "
        "Matches rows by email: links existing users, creates temporary accounts for unknowns. "
        "Sends a K-PAI membership email to anyone who has now been checked-in at 2+ seminars."
    ),
)
async def import_csv(
    seminar_id: int,
    file: UploadFile = File(..., description="CSV file (UTF-8 or UTF-8-BOM)"),
    current_user: User = Depends(get_current_user),
    import_service: ImportService = Depends(get_import_service),
):
    if current_user.role != UserRole.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff only",
        )

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv files are accepted",
        )

    raw = await file.read()
    try:
        csv_content = raw.decode("utf-8-sig")  # handles UTF-8 BOM exported by Excel
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded",
        )

    return await import_service.import_csv(seminar_id, csv_content)
