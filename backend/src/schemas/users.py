
from pydantic import (
    BaseModel,
    EmailStr,
    HttpUrl,
    constr,
    field_validator,
    ValidationError,
    validator,
    Field,
)
import bcrypt
from datetime import datetime
from typing import Optional, Union
from fastapi import UploadFile
from config import logger

class UserBase(BaseModel):
    fio: constr(min_length=12, max_length=255)
    login: constr(min_length=5, max_length=50)
    role_id: int
    email: Optional[EmailStr]
    photo_url: Optional[str] = Field(
        None, description="URL загруженной фотографии (автоматически генерируется)"
    )


class UserCreate(UserBase):
    password: constr(min_length=5, max_length=50)
    photo: Optional[UploadFile] = Field(
        None, description="Файл фотографии для загрузки (JPEG/PNG)", exclude=True
    )

    @validator("password")
    def hash_password(cls, password: str) -> bytes:
        salt = bcrypt.gensalt()
        pwd_bytes: bytes = password.encode()
        return bcrypt.hashpw(pwd_bytes, salt)

class UserUpdate(UserBase):
    fio: Optional[constr(min_length=12, max_length=255)] = None
    login: Optional[constr(min_length=5, max_length=50)] = None
    password: Optional[constr(min_length=5, max_length=50)] = None
    role_id: Optional[int] = None
    active: Optional[bool] = None
    email: Optional[EmailStr] = None
    photo: Optional[UploadFile] = Field(
        None, description="Новый файл фотографии для обновления", exclude=True
    )

    @validator("password")
    def hash_password(cls, password: str) -> bytes:
        salt = bcrypt.gensalt()
        pwd_bytes: bytes = password.encode()
        return bcrypt.hashpw(pwd_bytes, salt)

class UserInDB(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    active: bool

    class Config:
        from_attributes = True
        populate_by_name = True
        exclude = {"password"}
