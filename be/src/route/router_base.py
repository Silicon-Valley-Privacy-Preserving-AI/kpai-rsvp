from src.route.v1.user import router as router_user
from src.route.v1.system import router as router_system
from src.route.v1.auth import router as router_auth
from src.route.v1.seminar import router as router_seminar

routers = [
    router_system,
    router_user,
    router_auth,
    router_seminar
]