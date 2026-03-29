from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api.middleware import TenantMiddleware
from api.routes.dashboard import router as dashboard_router
from api.routes.members import router as members_router
from api.routes.risk import router as risk_router
from api.routes.actions import router as actions_router
from api.routes.notifications import router as notifications_router
from api.routes.payments import router as payments_router
from api.routes.settings import router as settings_router
from api.routes.upload import router as upload_router
from infra.config import get_settings

settings = get_settings()

app = FastAPI(title="Pulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TenantMiddleware)

app.include_router(dashboard_router)
app.include_router(members_router)
app.include_router(risk_router)
app.include_router(upload_router)
app.include_router(payments_router)
app.include_router(actions_router)
app.include_router(settings_router)
app.include_router(notifications_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
