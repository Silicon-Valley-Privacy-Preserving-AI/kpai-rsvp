from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.model.user import User
from src.route.v1.auth import get_auth_service
from src.service.auth_service import AuthService
from src.service.user_service import UserService
from src.schema.user import UserCreateRequest, UserModifyRequest, UserResponse, SetPasswordRequest, UserAdminResponse
from src.model.user import UserRole
from src.util.security import http_bearer
from fastapi import status

router = APIRouter(prefix="/users", tags=["User"])

async def get_user_service(db: AsyncSession = Depends(get_db)):
    return UserService(db)

async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(http_bearer),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.get_current_user(auth)

@router.get("",
            summary="Get my user data",
            response_model=UserResponse
            )
async def get_user(
        current_user: User = Depends(get_current_user)
):
    return current_user

@router.put("", summary="Modify user data")
async def modify_user(
        user_data: UserModifyRequest,
        current_user: User = Depends(get_current_user),
        user_service: UserService = Depends(get_user_service)
):
    return await user_service.modify_user(current_user, user_data)

@router.post("",
             summary="Create new user (Register)",
             response_model=UserResponse,
             status_code=status.HTTP_201_CREATED)
async def create_user(
        user_data: UserCreateRequest,
        user_service: UserService = Depends(get_user_service)
):
    return await user_service.create_user(user_data)

@router.delete("", summary="Delete user (Withdraw)")
async def delete_user(
        current_user: User = Depends(get_current_user),
        user_service: UserService = Depends(get_user_service)
):
    return await user_service.delete_user(current_user)


@router.post(
    "/set-password",
    summary="Set password for a temporary account (imported via CSV)",
    description=(
        "Converts a temporary account (created during CSV import) into a full account. "
        "Provide the email that was imported. "
        "Returns 409 if the account already has a password."
    ),
    response_model=UserResponse,
)
async def set_password(
        payload: SetPasswordRequest,
        user_service: UserService = Depends(get_user_service),
):
    return await user_service.set_password_for_temp_user(
        email=payload.email,
        new_password=payload.new_password,
    )


@router.get(
    "/list",
    summary="(Staff) Get all users",
    response_model=list[UserAdminResponse],
)
async def list_users(
        current_user: User = Depends(get_current_user),
        user_service: UserService = Depends(get_user_service),
):
    from fastapi import HTTPException
    if current_user.role != UserRole.STAFF:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")
    return await user_service.get_all_users()


@router.delete("/{user_id}", summary="(Staff) Delete a user by ID")
async def admin_delete_user(
        user_id: int,
        current_user: User = Depends(get_current_user),
        user_service: UserService = Depends(get_user_service),
):
    from fastapi import HTTPException
    if current_user.role != UserRole.STAFF:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    return await user_service.delete_user_by_id(user_id)