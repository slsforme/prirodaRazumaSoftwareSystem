from typing import Optional
from pydantic import BaseModel, constr, validator
from datetime import datetime
from models.models import SubDirectories


class DocumentBase(BaseModel):
    name: constr(max_length=255)
    patient_id: int
    subdirectory_type: SubDirectories
    author_id: Optional[int] = None

    @validator("name")
    def validate_name_length(cls, v):
        if len(v) > 255:
            raise ValueError("Название документа не может превышать 255 символов")
        return v


class DocumentCreate(DocumentBase):
    data: bytes


class DocumentUpdate(BaseModel):
    name: Optional[constr(max_length=255)] = None
    patient_id: Optional[int] = None
    subdirectory_type: Optional[SubDirectories] = None
    author_id: Optional[int] = None
    data: Optional[bytes] = None

    @validator("name")
    def validate_name_length(cls, v):
        if v and len(v) > 255:
            raise ValueError("Название документа не может превышать 255 символов")
        return v


class DocumentInDB(DocumentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True
