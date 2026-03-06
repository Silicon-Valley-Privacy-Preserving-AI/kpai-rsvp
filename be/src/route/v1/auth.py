from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.schema.auth import LoginRequest, LoginResponse
from src.service.user_service import UserService
from src.service.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

async def get_auth_service(db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    return AuthService(user_service)

@router.post("/login",
             summary="Login",
             response_model=LoginResponse)
async def login(login_data: LoginRequest, auth_service: AuthService = Depends(get_auth_service)):
    return await auth_service.login(login_data.email, login_data.password)