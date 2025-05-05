from pydantic import (
    BaseModel,
    EmailStr,
    constr,
    field_validator,
    ValidationError,
    Field,
    model_validator,
)
import bcrypt
from datetime import datetime
from typing import Optional, Union, Annotated
from fastapi import UploadFile
import re
from config import logger

LOGIN_REGEX = r"^[a-zA-Z0-9]{5,50}$"
FIO_REGEX = r'^[А-Яа-яёЁ\s-]{3,255}$'
PASSWORD_REGEX = r"^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]+$"
class UserBase(BaseModel):
    fio: Annotated[
        str,
        Field(
            min_length=3,
            max_length=255,
            examples=["John Doe"],
            pattern=FIO_REGEX,
        ),
    ]
    login: Annotated[
        str,
        Field(
            min_length=5,
            max_length=50,
            examples=["john123"],
            pattern=LOGIN_REGEX,
        ),
    ]
    role_id: int
    email: Optional[EmailStr] = Field(
        None,
        examples=["john.doe@example.com"],
        min_length=5,
        max_length=255,
    )
    photo_url: Optional[str] = Field(
        None,
        description="URL загруженной фотографии (автоматически генерируется)",
    )

    @field_validator("fio")
    def validate_fio(cls, v):
        if not re.fullmatch(FIO_REGEX, v):
            raise ValueError(
                "ФИО должно содержать только латинские буквы, пробелы, апострофы и дефисы"
            )
        return v.title()

    @field_validator("login")
    def validate_login(cls, v):
        if not re.fullmatch(LOGIN_REGEX, v):
            raise ValueError(
                "Логин должен содержать только латинские буквы и цифры"
            )
        return v.lower()

class UserCreate(UserBase):
    password: Annotated[
        str,
        Field(
            min_length=5,
            max_length=50,
            examples=["StrongPass123!"],
            pattern=PASSWORD_REGEX,
        ),
    ]
    photo: Optional[UploadFile] = Field(
        None,
        description="Файл фотографии для загрузки (JPEG/PNG)",
        exclude=True,
    )

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) < 5 or len(v) > 50:
            raise ValueError("Длина пароля должна быть от 5 до 50 символов")
        if not re.fullmatch(PASSWORD_REGEX, v):
            raise ValueError(
                "Пароль может содержать только: "
                "латинские буквы, цифры и специальные символы !@#$%^&*()_+-=[]{};':\"\\|,.<>/?"
            )
        return v

    @field_validator("password")
    def hash_password(cls, v: str) -> bytes:
        salt = bcrypt.gensalt()
        pwd_bytes: bytes = v.encode()
        return bcrypt.hashpw(pwd_bytes, salt)

class UserUpdate(UserBase):
    fio: Optional[Annotated[str, Field(pattern=FIO_REGEX)]] = None
    login: Optional[Annotated[str, Field(pattern=LOGIN_REGEX)]] = None
    password: Optional[Annotated[str, Field(pattern=PASSWORD_REGEX)]] = None
    role_id: Optional[int] = None
    active: Optional[bool] = None
    email: Optional[EmailStr] = None
    photo: Optional[UploadFile] = Field(
        None,
        description="Новый файл фотографии для обновления",
        exclude=True,
    )

    @field_validator("password")
    def hash_password(cls, v: Union[str, None]) -> Optional[bytes]:
        if v is None:
            return None
        salt = bcrypt.gensalt()
        pwd_bytes: bytes = v.encode()
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