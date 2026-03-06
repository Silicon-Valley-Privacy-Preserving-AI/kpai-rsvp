from fastapi import APIRouter
from src.route.router_base import routers
import pkgutil, importlib
import src.route


def init_router(package):
    package_path = package.__path__
    module_name = package.__name__

    for module_info in pkgutil.iter_modules(package_path):
        name = module_info.name
        full_module = f"{module_name}.{name}"

        module = importlib.import_module(full_module)

        if hasattr(module, "__path__"):
            init_router(module)


def add_router(application):
    init_router(src.route)

    master_router = APIRouter(prefix="/api/v1")
    for router in routers:
        master_router.include_router(router)

    application.include_router(master_router)