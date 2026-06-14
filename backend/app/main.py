from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from .core.config import get_settings
from .core.database import Base, engine
from .routes import dashboard, logs, rules, ml, healing, traffic, reports

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.VERSION,
    description = "Self-Healing Web Application Firewall — REST API",
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.CORS_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(dashboard.router)
app.include_router(logs.router)
app.include_router(rules.router)
app.include_router(ml.router)
app.include_router(healing.router)
app.include_router(traffic.router)
app.include_router(reports.router)

@app.get("/", tags=["Health"])
def root():
    return {"app": settings.APP_NAME, "version": settings.VERSION, "status": "operational"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "version": settings.VERSION}
