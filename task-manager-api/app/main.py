import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from loguru import logger
from fastapi.staticfiles import StaticFiles
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
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

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = '{0:.2f}'.format(process_time)
    logger.info(f"{request.method} {request.url.path} completed in {formatted_process_time}ms (Status: {response.status_code})")
    return response

# Setup custom global exception handlers
setup_exception_handlers(app)

# Include the aggregated v1 API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME}!",
        "docs_url": "/docs",
        "status": "healthy"
    }
