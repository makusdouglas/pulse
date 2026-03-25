from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api.middleware import TenantMiddleware
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


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
