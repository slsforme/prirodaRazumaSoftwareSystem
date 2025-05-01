from pydantic import BaseModel, constr, field_serializer

from typing import Optional
from datetime import datetime, date


class PatientBase(BaseModel):
    fio: constr(min_length=10, max_length=255)
    date_of_birth: date


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    fio: Optional[constr(min_length=10, max_length=255)] = None
    date_of_birth: Optional[date] = None


class PatientInDB(PatientBase):
    id: int
    age: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("age")
    def serialize_age(self, _age: int, _info) -> int:
        return self.age

    class Config:
        from_attributes = True
        populate_by_name = True
