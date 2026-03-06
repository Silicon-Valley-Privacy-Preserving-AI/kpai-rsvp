from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from src.config.environments import JWT_SECRET, ALGORITHM, TOKEN_LIFETIME_MINUTE
from src.util.security import verify_password, decode_access_token, http_bearer
from src.service.user_service import UserService
import jwt

class AuthService:
    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def login(self, email: str, password: str):
        user = await self.user_service.get_user_by_email(email)
        if not user or not verify_password(password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        access_token = self.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}

    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTE)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

    async def get_current_user(self, auth: HTTPAuthorizationCredentials = Depends(http_bearer)):
        if not auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No credential provided"
            )

        payload = decode_access_token(auth.credentials)
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not a valid credential"
            )

        user = await self.user_service.get_user_by_email(email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User does not exist"
            )

        return user