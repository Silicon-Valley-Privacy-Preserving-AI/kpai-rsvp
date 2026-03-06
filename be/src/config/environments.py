import os
from dotenv import load_dotenv


load_dotenv()


PORT = int(os.getenv("PORT"))
if not PORT:
    raise RuntimeError("PORT is missing in the .env file")


SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing in the .env file")


ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS")
if not ALLOWED_ORIGINS:
    raise RuntimeError("ALLOWED_ORIGINS is missing in the .env file")


JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")
TOKEN_LIFETIME_MINUTE = int(os.getenv("TOKEN_LIFETIME_MINUTE"))
if not all([JWT_SECRET, ALGORITHM, TOKEN_LIFETIME_MINUTE]):
    raise RuntimeError("JWT environment variables are missing")


STAFF_CODE = os.getenv("STAFF_CODE")
if not STAFF_CODE:
    raise RuntimeError("STAFF_CODE is missing in the .env file")