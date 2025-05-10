from sqlalchemy import (
    ForeignKey,
    LargeBinary,
    String,
    Integer,
    Boolean,
    Date,
    Enum as SQLAlchemyEnum,
    event,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional, List
from datetime import date
from enum import Enum
import re

from db.db import Base


class SubDirectories(str, Enum):
    DIAGNOSTICS = "Диагностика"
    ANAMNESIS = "Анамнез"
    WORK_PLAN = "План работы"
    COMMENTS = "Комментарии специалистов"
    PHOTOS_AND_VIDEOS = "Фотографии и Видео"


class User(Base):
    fio: Mapped[str] = mapped_column(String(255), nullable=False)
    login: Mapped[str] = mapped_column(String(50), nullable=False)
    password: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    photo_url: Mapped[str] = mapped_column(String(255), nullable=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )

    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="author", cascade="all, delete-orphan"
    )

    @validates("fio", "login", "email")
    def validate_string_fields(self, key, value):
        min_lengths = {"fio": 3, "login": 5, "email": 5}

        patterns = {
            "fio": r"^[А-Яа-яёЁ\s\'-]{3,255}$",
            "login": r"^[A-Za-z0-9]{5,50}$",
            "email": r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        }

        error_messages = {
            "fio": "ФИО должно содержать только латинские буквы, пробелы, апострофы и дефисы (3-255 символов)",
            "login": "Логин должен содержать только латинские буквы и цифры (5-50 символов)",
            "email": "Некорректный формат email. Пример: user@example.com",
        }

        if value is not None:
            if key in min_lengths and len(value) < min_lengths[key]:
                raise ValueError(error_messages[key])

            if key in patterns:
                if not re.fullmatch(patterns[key], value):
                    raise ValueError(error_messages[key])

        return value


class Role(Base):
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    users: Mapped[List["User"]] = relationship(
        "User", backref="role", cascade="all, delete-orphan"
    )

    @validates("name", "description")
    def validate_role_fields(self, key, value):
        validations = {
            "name": {
                "min_length": 3,
                "max_length": 255,
                "pattern": r"^[А-Яа-яёЁ\s-]{3,255}$",
                "error": (
                    "Название роли должно содержать только: латиницу, кириллицу, "
                    "цифры, пробелы, дефисы и подчеркивания (3-255 символов)"
                ),
            },
            "description": {
                "min_length": 0,
                "max_length": 1000,
                "pattern": r'^[\wА-Яа-яёЁ!@#$%^&*()+=\[\]{};:\'"\\|,.<>/?\s-]{0,1000}$',
                "error": (
                    "Описание содержит запрещенные символы. Допустимы: "
                    "буквы, цифры, пробелы и специальные символы (до 1000 символов)"
                ),
            },
        }

        if value is None and key == "description":
            return value

        if key in validations:
            rules = validations[key]

            if "min_length" in rules and len(value) < rules["min_length"]:
                raise ValueError(rules["error"])

            if "max_length" in rules and len(value) > rules["max_length"]:
                raise ValueError(rules["error"])

            if "pattern" in rules and not re.fullmatch(rules["pattern"], value):
                raise ValueError(rules["error"])

        return value


class Document(Base):
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary)

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    patient: Mapped["Patient"] = relationship("Patient", back_populates="documents")

    subdirectory_type: Mapped[SubDirectories] = mapped_column(
        SQLAlchemyEnum(SubDirectories), nullable=False
    )

    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    author: Mapped[Optional["User"]] = relationship("User", back_populates="documents")

    @classmethod
    async def create_document(
        cls,
        session: AsyncSession,
        name: str,
        data: bytes,
        patient_id: int,
        subdirectory_type: SubDirectories,
        author_id: int,
    ) -> "Document":
        document = cls(
            name=name,
            data=data,
            patient_id=patient_id,
            subdirectory_type=subdirectory_type,
            author_id=author_id,
        )
        session.add(document)
        await session.flush()
        return document


class Patient(Base):
    fio: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)

    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="patient", cascade="all, delete-orphan"
    )

    @validates("fio")
    def validate_patient_fields(self, key, value):
        validations = {
            "fio": {
                "min_length": 3,
                "max_length": 255,
                "pattern": r"^[А-Яа-яёЁ\s-]{3,255}$",
                "error": "ФИО должно содержать только кириллицу и пробелы (3-255 символов)",
            }
        }

        if key in validations:
            rules = validations[key]

            if len(value) < rules["min_length"]:
                raise ValueError(rules["error"])

            if len(value) > rules["max_length"]:
                raise ValueError(rules["error"])

            if not re.fullmatch(rules["pattern"], value):
                raise ValueError(rules["error"])

        return value

    async def get_documents_by_directory(
        self, session: AsyncSession, directory_type: SubDirectories
    ) -> List[Document]:
        from sqlalchemy import select

        query = (
            select(Document)
            .where(
                Document.patient_id == self.id,
                Document.subdirectory_type == directory_type,
            )
            .order_by(Document.created_at.desc())
        )

        result = await session.execute(query)
        return result.scalars().all()

    @property
    def age(self) -> int:
        today = date.today()
        return (
            today.year
            - self.date_of_birth.year
            - (
                (today.month, today.day)
                < (self.date_of_birth.month, self.date_of_birth.day)
            )
        )


@event.listens_for(Patient, "after_insert")
def create_default_subdirectories(mapper, connection, target):
    pass


async def ensure_patient_subdirectories(session: AsyncSession):
    from sqlalchemy import select

    result = await session.execute(select(Patient))
    patients = result.scalars().all()

    for patient in patients:
        for subdir_type in SubDirectories:
            docs = await patient.get_documents_by_directory(session, subdir_type)
            if not docs:
                pass
