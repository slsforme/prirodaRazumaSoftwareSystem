from pydantic import BaseModel, Field, field_validator

from datetime import datetime
from typing import Optional
import re

NAME_REGEX = r"^[A-Za-zА-Яа-яёЁ0-9\s\-_]{3,255}$"
DESCRIPTION_REGEX = r"^[A-Za-zА-Яа-яёЁ0-9!@#$%^&*()_+=\-\[\]\{\};':\"\\|,.<>/?\s]{0,1000}$"

class RoleBase(BaseModel):
    name: str = Field(
        min_length=3,
        max_length=255,
        pattern=NAME_REGEX,
        examples=["Администратор"],
        description="Название роли (латиница, кириллица, цифры, дефисы и подчеркивания)"
    )
    description: Optional[str] = Field(
        default=None,
        min_length=0,
        max_length=1000,
        pattern=DESCRIPTION_REGEX,
        examples=["Роль с полным доступом к системе (админ)"],
        description="Описание роли может содержать любые символы (до 1000 символов)"
    )

    @field_validator('name')
    def validate_name(cls, v):
        if not re.fullmatch(NAME_REGEX, v):
            raise ValueError(
                "Название роли должно содержать только: "
                "латиницу, кириллицу, цифры, пробелы, дефисы и подчеркивания "
                "(3-255 символов)"
            )
        return v.strip()

    @field_validator('description')
    def validate_description(cls, v):
        if v is not None:
            if not re.fullmatch(DESCRIPTION_REGEX, v):
                raise ValueError(
                    "Описание содержит запрещенные символы. "
                    "Допустимы: буквы, цифры, пробелы и специальные символы"
                )
            if len(v) > 1000:
                raise ValueError("Описание не должно превышать 1000 символов")
        return v

class RoleCreate(RoleBase):
    pass

class RoleUpdate(RoleBase):
    name: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=255,
        pattern=NAME_REGEX,
        examples=["Модератор"]
    )
    description: Optional[str] = Field(
        default=None,
        max_length=1000,
        pattern=DESCRIPTION_REGEX,
        examples=["Роль с ограниченными правами: просмотр/редактирование"]
    )

class RoleInDB(RoleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True