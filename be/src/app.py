from fastapi import FastAPI
from src.middleware.cors import add_cors
from src.route.router import add_router
from src.lifespan import lifespan


app = FastAPI(
    title="K-PAI backend web server",
    description="K-PAI backend api documentation",
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True}
)


add_cors(app)
add_router(app)