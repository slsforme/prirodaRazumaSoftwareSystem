from pydantic import BaseModel, field_validator, Field
from datetime import datetime, date
import re
from typing import Optional

class PatientBase(BaseModel):
    fio: str = Field(..., min_length=3, max_length=255)
    date_of_birth: date

    @field_validator('fio')
    def validate_fio(cls, v):
        pattern = r'^[A-Za-zА-Яа-яёЁ\s\'-]{3,255}$'
        if not re.fullmatch(pattern, v):
            raise ValueError(
                'ФИО должно содержать только кириллицу и пробелы (3-255 символов)'
            )
        return v.strip()

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    fio: Optional[str] = Field(None, min_length=3, max_length=255)
    date_of_birth: Optional[date] = None

    @field_validator('fio')
    def validate_fio(cls, v):
        if v is None:
            return v
            
        pattern = r'^[А-Яа-яёЁ\s]{3,255}$'
        if not re.fullmatch(pattern, v):
            raise ValueError(
                'ФИО должно содержать только кириллицу и пробелы (3-255 символов)'
            )
        return v.strip()

class PatientInDB(PatientBase):
    id: int
    age: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True