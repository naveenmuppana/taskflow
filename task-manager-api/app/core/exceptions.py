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

def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
