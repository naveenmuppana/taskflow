import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from loguru import logger
from sqlalchemy import text
from fastapi.staticfiles import StaticFiles

from app.api.deps import DBDep
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.core.logger import setup_logging
from app.core.rate_limit import limiter
from app.db.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    setup_logging()
    logger.info("Starting up Task Manager API...")
    yield
    # Shutdown actions
    logger.info("Shutting down Task Manager API...")
    await engine.dispose()

openapi_tags = [
    {
        "name": "Authentication",
        "description": "Operations for user registration, token generation, and secure session management with stateless revocation.",
    },
    {
        "name": "Tasks",
        "description": "Core CRUD operations for managing tasks, filtering, sorting, and retrieving aggregated analytics.",
    },
    {
        "name": "Subtasks",
        "description": "Granular action items attached to parent tasks.",
    },
    {
        "name": "Categories",
        "description": "Organizational categories with custom color swatches for grouping tasks.",
    },
    {
        "name": "Tags",
        "description": "Flexible labeling tags with color swatches for cross-cutting task categorization.",
    },
    {
        "name": "Projects",
        "description": "High-level project containers for grouping related tasks and workflows.",
    },
    {
        "name": "Health",
        "description": "Kubernetes and Docker orchestration liveness (`/healthz`) and readiness (`/readyz`) probes.",
    },
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An enterprise-grade, high-performance asynchronous Task Management REST API built with FastAPI, SQLAlchemy 2.0, and SQLite/PostgreSQL.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    openapi_tags=openapi_tags,
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory="app/static", html=True), name="static")

# SlowAPI Setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging, Correlation ID & Security Headers Middleware
@app.middleware("http")
async def correlation_and_security_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    logger.info(
        f"[{correlation_id}] {request.method} {request.url.path} completed in {process_time:.2f}ms (Status: {response.status_code})"
    )
    
    # Set Correlation ID header
    response.headers["X-Correlation-ID"] = correlation_id
    
    # Set Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# Setup custom global exception handlers
setup_exception_handlers(app)

# Include the aggregated v1 API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/healthz", tags=["Health"])
async def healthz():
    return {"status": "ok"}

@app.get("/readyz", tags=["Health"])
async def readyz(db: DBDep):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness probe failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "detail": "Database connection failed"}
        )

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME}!",
        "docs_url": "/docs",
        "status": "healthy"
    }
