from fastapi.security import HTTPBearer
from passlib.context import CryptContext
from src.config.environments import SECRET_KEY
import hashlib, hmac

import jwt
from fastapi import HTTPException, status
from src.config.environments import JWT_SECRET, ALGORITHM

http_bearer = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _get_keyed_password(password: str) -> bytes:
    """
    Generate HMAC-SHA256 hash using SECRET_KEY to resolve 72 bytes limit of bcrypt and put some pepper on.
    """
    return hmac.new(
        SECRET_KEY.encode(),
        password.encode(),
        hashlib.sha256
    ).digest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare plain password with hashed password."""
    keyed_password = _get_keyed_password(plain_password)
    return pwd_context.verify(keyed_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hashs the password"""
    keyed_password = _get_keyed_password(password)
    return pwd_context.hash(keyed_password)


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )