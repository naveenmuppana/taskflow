from pydantic import BaseModel, Field

class Token(BaseModel):
    access_token: str = Field(..., description="JWT Access Token")
    refresh_token: str = Field(..., description="JWT Refresh Token")
    token_type: str = Field(default="bearer", description="Token type, typically 'bearer'")

class TokenPayload(BaseModel):
    sub: str | None = Field(None, description="Subject (User ID) of the token")
    type: str | None = Field(None, description="Token type ('access' or 'refresh')")

class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="A valid, non-expired refresh token")
