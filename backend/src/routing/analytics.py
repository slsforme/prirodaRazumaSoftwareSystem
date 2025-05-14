from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    status,
)
from fastapi_cache.decorator import cache
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
import pandas as pd

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import csv
import io

from db.db import get_async_session
from models.models import Document, Patient, User, Role, SubDirectories
from config import settings, logger
from cache.utils import Base64Coder
from .base import custom_key_builder
from auth.auth import require_role

router = APIRouter(prefix="/statistics", tags=["statistics"])

_max_amount_of_days: int = 365 * 5


async def get_documents_stats(
    days: int, user_id: int = None, session: AsyncSession = Depends(get_async_session)
) -> List[Dict[str, Any]]:
    try:
        if days < 1 or days > _max_amount_of_days:
            raise HTTPException(
                status_code=400,
                detail=f"Аргумент 'Дни' должен лежать в пределах 1 и {_max_amount_of_days}",
            )

        today = datetime.now().date()
        start_date = today - timedelta(days=days - 1)

        query = (
            select(
                func.date(Document.created_at).label("date"),
                func.count().label("count"),
            )
            .where(func.date(Document.created_at) >= start_date)
            .group_by(func.date(Document.created_at))
            .order_by(func.date(Document.created_at))
        )

        if user_id is not None:
            query = query.where(Document.author_id == user_id)

        result = await session.execute(query)
        data = result.all()

        stats = {(start_date + timedelta(days=i)).isoformat(): 0 for i in range(days)}

        for row in data:
            date_str = row.date.isoformat()
            stats[date_str] = row.count

        return [{"date": k, "count": v} for k, v in stats.items()]
    except Exception as e:
        logger.error(f"Произошла ошибка при получении статистике о Документах: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики о Документах",
        )


async def get_patients_stats(days: int, session: AsyncSession) -> List[Dict[str, Any]]:
    try:
        if days < 1 or days > _max_amount_of_days:
            raise HTTPException(
                status_code=400,
                detail=f"Аргумент 'Дни' должен лежать в пределах 1 и {_max_amount_of_days}",
            )

        today = datetime.now().date()
        start_date = today - timedelta(days=days - 1)

        query = (
            select(
                func.date(Document.created_at).label("date"),
                func.count(func.distinct(Document.patient_id)).label("patient_count"),
            )
            .where(func.date(Document.created_at) >= start_date)
            .group_by(func.date(Document.created_at))
            .order_by(func.date(Document.created_at))
        )

        result = await session.execute(query)
        data = result.all()

        stats = {
            (start_date + timedelta(days=i)).isoformat(): {"patient_count": 0}
            for i in range(days)
        }

        for row in data:
            date_str = row.date.isoformat()
            stats[date_str]["patient_count"] = row.patient_count

        return [
            {"date": k, "patient_count": v["patient_count"]} for k, v in stats.items()
        ]
    except Exception as e:
        logger.error(f"Произошла ошибка при получении статистике о Пациентах: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики о Пациентах",
        )


async def get_users_stats(days: int, session: AsyncSession) -> List[Dict[str, Any]]:
    try:
        if days < 1 or days > _max_amount_of_days:
            raise HTTPException(
                status_code=400,
                detail=f"Аргумент 'Дни' должен лежать в пределах 1 и {_max_amount_of_days}",
            )

        today = datetime.now().date()
        start_date = today - timedelta(days=days - 1)

        query = (
            select(
                func.date(User.created_at).label("date"),
                func.count().label("users_count"),
            )
            .where(func.date(User.created_at) >= start_date)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )

        result = await session.execute(query)
        data = result.all()

        stats = {
            (start_date + timedelta(days=i)).isoformat(): {"users_count": 0}
            for i in range(days)
        }

        for row in data:
            date_str = row.date.isoformat()
            stats[date_str]["users_count"] = row.users_count

        return [{"date": k, "users_count": v["users_count"]} for k, v in stats.items()]
    except Exception as e:
        logger.error(f"Произошла ошибка при получении статистике о Пользователях: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики о Пользователях",
        )


async def get_roles_count(days: int, session: AsyncSession) -> List[Dict[str, Any]]:
    try:
        today = datetime.now().date()
        start_date = today - timedelta(days=days - 1)

        query = (
            select(
                Role.name.label("role_name"), func.count(User.id).label("user_count")
            )
            .join(User, Role.id == User.role_id)
            .where(func.date(User.created_at) >= start_date)
            .group_by(Role.name)
        )

        result = await session.execute(query)
        data = result.all()

        return [{"role": row.role_name, "count": row.user_count} for row in data]
    except Exception as e:
        logger.error(f"Ошибка получения статистики по ролям: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении статистики по ролям",
        )


async def get_documents_by_subdir(
    days: int, session: AsyncSession
) -> List[Dict[str, Any]]:
    try:
        today = datetime.now().date()
        start_date = today - timedelta(days=days - 1)

        query = (
            select(
                Document.subdirectory_type, func.count(Document.id).label("doc_count")
            )
            .where(func.date(Document.created_at) >= start_date)
            .group_by(Document.subdirectory_type)
        )

        result = await session.execute(query)
        db_data = {row.subdirectory_type: row.doc_count for row in result.all()}

        stats = []
        for subdir in SubDirectories:
            stats.append(
                {"subdirectory": subdir.value, "count": db_data.get(subdir, 0)}
            )

        return stats
    except Exception as e:
        logger.error(f"Ошибка получения статистики по поддиректориям: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении статистики по поддиректориям",
        )


@router.get(
    "/documents/{days}",
    response_model=List[Dict[str, Any]],
    description="Получение статистики по динамике документов по данному количеству дней",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
@cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
async def get_stats_by_days(
    days: int = Path(..., ge=1, le=_max_amount_of_days, examples=30),
    session: AsyncSession = Depends(get_async_session),
):
    return await get_documents_stats(days, None, session)


@router.get(
    "/documents/{days}/user/{user_id}",
    response_model=List[Dict[str, Any]],
    description="Получение статистики по загрузке документов по данному количеству дней у данного пользователя",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
@cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
async def get_user_stats_by_days(
    days: int = Path(..., ge=1, le=_max_amount_of_days, examples=30),
    user_id: int = Path(...),
    session: AsyncSession = Depends(get_async_session),
):
    return await get_documents_stats(days, user_id, session)


@router.get(
    "/patients/dynamics/{days}",
    response_model=List[Dict[str, Any]],
    description="Получение статистики по динамике Пациентов по данному количеству дней",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
@cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
async def get_patients_dynamics(
    days: int = Path(..., ge=1, le=_max_amount_of_days, examples=30),
    session: AsyncSession = Depends(get_async_session),
):
    return await get_patients_stats(days, session)


@router.get(
    "/users/dynamics/{days}",
    response_model=List[Dict[str, Any]],
    description="Получение статистики по динамике Пользователей по данному количеству дней",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
@cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
async def get_users_dynamics(
    days: int = Path(..., ge=1, le=_max_amount_of_days, examples=30),
    session: AsyncSession = Depends(get_async_session),
):
    return await get_users_stats(days, session)


@router.get(
    "/roles/count/{days}",
    response_model=List[Dict[str, Any]],
    description="Получение количества пользователей по ролям за период",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
@cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
async def get_roles_stats(
    days: int = Path(..., ge=1, le=_max_amount_of_days),
    session: AsyncSession = Depends(get_async_session),
):
    return await get_roles_count(days, session)


@router.get(
    "/documents/subdirectories/{days}",
    response_model=List[Dict[str, Any]],
    description="Получение количества документов по поддиректориям за период",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
@cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
async def get_subdirectories_stats(
    days: int = Path(..., ge=1, le=_max_amount_of_days),
    session: AsyncSession = Depends(get_async_session),
):
    return await get_documents_by_subdir(days, session)


@router.get(
    "/export/csv",
    dependencies=[Depends(require_role(allowed_roles={1, 2}))],
)
async def export_csv_report(
    report_type: str,
    days: int = Query(..., ge=1, le=365 * 5),
    user_id: Optional[int] = None,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        if report_type == "roles":
            data = await get_roles_count(days, session)
        elif report_type == "documents":
            data = await get_documents_by_subdir(days, session)
        elif report_type == "patients":
            data = await get_patients_stats(days, session)
        elif report_type == "users":
            data = await get_users_stats(days, session)
        elif report_type == "user-documents":
            if not user_id:
                raise HTTPException(status_code=400, detail="Необходим ID Пользователя")
            data = await get_documents_stats(days, user_id, session)
        else:
            raise HTTPException(status_code=400, detail="Неверный формат отчета")

        required_fields = {
            "roles": ["role", "count"],
            "documents": ["subdirectory", "count"],
            "patients": ["date", "patient_count"],
            "users": ["date", "users_count"],
            "user-documents": ["date", "count"],
        }.get(report_type, [])

        for item in data:
            if not all(field in item for field in required_fields):
                logger.error(f"Некорректные данные: {item}")
                raise HTTPException(status_code=500, detail="Ошибка формата данных")

        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer, delimiter=";", lineterminator="\n")

        headers_map = {
            "roles": ["Роль", "Количество"],
            "documents": ["Категория", "Количество"],
            "patients": ["Дата", "Количество пациентов"],
            "users": ["Дата", "Количество пользователей"],
            "user-documents": ["Дата", "Количество документов"],
        }

        rows_map = {
            "roles": lambda item: [item["role"], item["count"]],
            "documents": lambda item: [item["subdirectory"], item["count"]],
            "patients": lambda item: [item["date"], item["patient_count"]],
            "users": lambda item: [item["date"], item["users_count"]],
            "user-documents": lambda item: [item["date"], item["count"]],
        }

        headers = headers_map[report_type]
        rows = [rows_map[report_type](item) for item in data]

        writer.writerow(headers)
        writer.writerows(rows)

        csv_buffer.seek(0)
        return StreamingResponse(
            io.BytesIO(csv_buffer.getvalue().encode("utf-8-sig")),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={report_type}_report.csv"
            },
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Ошибка при экспорте в формат CSV: {str(e)}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")


@router.get(
    "/export/xlsx",
    dependencies=[Depends(require_role(allowed_roles={1}))],
)
async def export_xlsx_report(
    report_type: str,
    days: int = Query(..., ge=1, le=365 * 5),
    user_id: Optional[int] = None,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        if report_type == "roles":
            data = await get_roles_count(days, session)
        elif report_type == "documents":
            data = await get_documents_by_subdir(days, session)
        elif report_type == "patients":
            data = await get_patients_stats(days, session)
        elif report_type == "users":
            data = await get_users_stats(days, session)
        elif report_type == "user-documents":
            if not user_id:
                raise HTTPException(status_code=400, detail="Необходим ID Пользователя")
            data = await get_documents_stats(days, user_id, session)
        else:
            raise HTTPException(status_code=400, detail="Неверный формат отчёта")

        df = pd.DataFrame()
        if report_type == "roles":
            df = pd.DataFrame([{"Роль": item["role"], "Количество": item["count"]} for item in data])
        elif report_type == "documents":
            df = pd.DataFrame([{"Категория": item["subdirectory"], "Количество": item["count"]} for item in data])
        elif report_type == "patients":
            df = pd.DataFrame([{"Дата": item["date"], "Количество пациентов": item["patient_count"]} for item in data])
        elif report_type == "users":
            df = pd.DataFrame([{"Дата": item["date"], "Количество пользователей": item["users_count"]} for item in data])
        elif report_type == "user-documents":
            df = pd.DataFrame([{"Дата": item["date"], "Количество документов": item["count"]} for item in data])

        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Отчёт")

        excel_buffer.seek(0)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={report_type}_report.xlsx"
            },
        )

    except Exception as e:
        logger.error(f"Ошибка при экспорте в формат Excel: {str(e)}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")
