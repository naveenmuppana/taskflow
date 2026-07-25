from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class APIException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)

class UserNotFoundException(APIException):
    def __init__(self, detail: str = "User not found"):
        super().__init__(status_code=404, detail=detail)

class UserAlreadyExistsException(APIException):
    def __init__(self, detail: str = "A user with this email already exists"):
        super().__init__(status_code=400, detail=detail)

class TaskNotFoundException(APIException):
    def __init__(self, detail: str = "Task not found"):
        super().__init__(status_code=404, detail=detail)

class InvalidCredentialsException(APIException):
    def __init__(self, detail: str = "Incorrect email or password"):
        super().__init__(status_code=401, detail=detail)

class TokenExpiredException(APIException):
    def __init__(self, detail: str = "Token has expired"):
        super().__init__(status_code=401, detail=detail)

class TokenInvalidException(APIException):
    def __init__(self, detail: str = "Invalid token"):
        super().__init__(status_code=401, detail=detail)

class ForbiddenException(APIException):
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(status_code=403, detail=detail)

class ProjectNotFoundException(APIException):
    def __init__(self, detail: str = "Project not found"):
        super().__init__(status_code=404, detail=detail)

class CategoryNotFoundException(APIException):
    def __init__(self, detail: str = "Category not found"):
        super().__init__(status_code=404, detail=detail)

class TagNotFoundException(APIException):
    def __init__(self, detail: str = "Tag not found"):
        super().__init__(status_code=404, detail=detail)

class TagAlreadyExistsException(APIException):
    def __init__(self, detail: str = "Tag already exists"):
        super().__init__(status_code=400, detail=detail)

class SubtaskNotFoundException(APIException):
    def __init__(self, detail: str = "Subtask not found"):
        super().__init__(status_code=404, detail=detail)

from fastapi.exceptions import RequestValidationError
from loguru import logger

def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            errors.append({
                "field": " -> ".join([str(loc) for loc in error.get("loc", [])]),
                "message": error.get("msg", "Invalid value"),
                "type": error.get("type", "value_error")
            })
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": errors
                }
            }
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An internal server error occurred"
                }
            }
        )

