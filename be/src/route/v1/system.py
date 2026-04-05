from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.service.system_service import SystemService
from src.schema.seminar import SeminarResponse

router = APIRouter(prefix="/system", tags=["System"])

async def get_system_service(db: AsyncSession = Depends(get_db)):
    return SystemService(db)

@router.get("/healthcheck",
             summary="Health Check",
             description="Return data about whether server is live",
             responses={
                 200: {
                     "description": "When server is alive",
                     "content": {
                         "application/json": {
                             "example": {"message": "yes"}
                         }
                     }
                 }
             }
             )
async def create_user(system_service: SystemService = Depends(get_system_service)):
    return await system_service.healthcheck()

@router.get("/users", summary="Get all users entry")
async def get_users(system_service: SystemService = Depends(get_system_service)):
    return await system_service.get_users()

@router.get("/seminars", summary="Get all seminars entry", response_model=list[SeminarResponse])
async def get_seminars(system_service: SystemService = Depends(get_system_service)):
    return await system_service.get_seminars()

@router.get("/seminar_rsvps", summary="Get all seminar_rsvps entry")
async def get_users(system_service: SystemService = Depends(get_system_service)):
    return await system_service.get_seminarRSVPs()


@router.post(
    "/mock-data-fill-up",
    summary="(Dev) Seed mock seminars, users, RSVPs, and check-ins",
    description=(
        "Creates 20 mock member accounts, 12 seminars spread over ~11 months, "
        "and realistic RSVP / check-in records for debugging the Statistics page.\n\n"
        "**Idempotent** — calling it again when mock data already exists returns a "
        "`skipped: true` response without touching the database.\n\n"
        "Mock user credentials: email `mock_user_01@kpai.test` … `mock_user_20@kpai.test`, "
        "password `password123`.\n\n"
        "⚠️ Development use only. Do not call in production."
    ),
    responses={
        200: {
            "content": {
                "application/json": {
                    "examples": {
                        "created": {
                            "summary": "First call — data seeded",
                            "value": {
                                "skipped": False,
                                "message": "Mock data created successfully.",
                                "users_created": 20,
                                "seminars_created": 12,
                                "rsvps_created": 162,
                                "checkins_created": 119,
                            },
                        },
                        "skipped": {
                            "summary": "Subsequent call — already exists",
                            "value": {
                                "skipped": True,
                                "message": "Mock data already exists. Delete mock users first to re-seed.",
                            },
                        },
                    }
                }
            }
        }
    },
)
async def fill_mock_data(system_service: SystemService = Depends(get_system_service)):
    return await system_service.fill_mock_data()