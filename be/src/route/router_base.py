from src.route.v1.user import router as router_user
from src.route.v1.system import router as router_system
from src.route.v1.auth import router as router_auth
from src.route.v1.seminar import router as router_seminar
from src.route.v1.checkin import router as router_checkin
from src.route.v1.import_csv import router as router_import

routers = [
    router_system,
    router_user,
    router_auth,
    router_seminar,
    router_checkin,
    router_import,
]
