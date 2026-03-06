from fastapi.middleware.cors import CORSMiddleware
from src.config.environments import ALLOWED_ORIGINS

def add_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )