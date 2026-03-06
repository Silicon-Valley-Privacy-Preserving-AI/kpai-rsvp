from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.service.system_service import SystemService

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

@router.get("/seminars", summary="Get all seminars entry")
async def get_users(system_service: SystemService = Depends(get_system_service)):
    return await system_service.get_seminars()

@router.get("/seminar_rsvps", summary="Get all seminar_rsvps entry")
async def get_users(system_service: SystemService = Depends(get_system_service)):
    return await system_service.get_seminarRSVPs()