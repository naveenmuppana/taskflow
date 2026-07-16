from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TagBase(BaseModel):
    name: str
    color: str = "#3b82f6"

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None

class TagResponse(TagBase):
    id: int
    created_at: datetime
    owner_id: int
    
    model_config = ConfigDict(from_attributes=True)
