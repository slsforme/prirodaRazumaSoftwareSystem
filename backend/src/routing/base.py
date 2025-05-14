from fastapi import (
    APIRouter,
    Depends,
    status,
    HTTPException,
    File,
    UploadFile,
    Form,
    Response,
)
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, ValidationError
from asyncpg.exceptions import UniqueViolationError
from redis import asyncio as aioredis

from urllib.parse import quote
import json
import traceback
import re

from typing import List, Dict, Any, TypeVar, Generic, Type, Optional
from auth.auth import require_role

from services.base import BaseService
from config import settings, logger
from cache.utils import Base64Coder
from .utils import get_russian_forms

T = TypeVar("T", bound=BaseModel)
DB = TypeVar("DB", bound=BaseModel)
U = TypeVar("U", bound=BaseModel)


def custom_key_builder(func, namespace: Optional[str] = None, *args, **kwargs):
    namespace = namespace or f"{cache_prefix}"
    prefix = f"{FastAPICache.get_prefix()}:fastapi_cache:{namespace}:"
    module_path = func.__module__
    function_name = func.__qualname__
    if function_name == "get_all":
        cache_key = f"{prefix}:{module_path}:{function_name}"
    else:
        cache_key = f"{prefix}:{module_path}:{function_name}"
        arg_dict = kwargs
        if args:
            func_args = func.__code__.co_varnames
            for i, arg_name in enumerate(func_args[1:]):
                if i < len(args):
                    arg_dict[arg_name] = args[i]
        for key, value in arg_dict.items():
            if key not in ["service", "session"]:
                cache_key += f":{key}:{str(value)}"
    return cache_key.replace(" ", "_")


def create_base_router(
    prefix: str,
    tags: List[str],
    service_dependency,
    create_schema: Type[T],
    read_schema: Type[DB],
    update_schema: Type[U],
    object_name: str = "объект",
    gender: str = "m",
    has_file_field: bool = False,
    file_field_name: str = "data",
    get_all_roles: set[int] = {1},
    get_by_id_roles: set[int] = {1},
    create_roles: set[int] = {1},
    update_roles: set[int] = {1},
    delete_roles: set[int] = {1},
    download_roles: set[int] = {1},
):
    forms = get_russian_forms(object_name, gender)
    router = APIRouter(prefix=prefix, tags=tags)
    cache_prefix = prefix.strip("/")
    
    def validate_file_extension(filename: str):
        allowed_extensions = re.compile(r'(\.pdf|\.docx|\.jpg|\.jpeg|\.png|\.mp4|\.mov|\.mkv)$', re.IGNORECASE)
        if not allowed_extensions.search(filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неподдерживаемый формат файла. Разрешены только файлы с расширениями: .pdf, .docx, .jpg, .jpeg, .png, .mp4, .mov, .mkv",
            )
        return True

    @router.get(
        "",
        responses={
            200: {
                "description": f"Успешно был получен лист {forms['genitive_plural']}"
            },
            500: {"description": "Внутренняя ошибка сервера"},
        },
        response_model=List[read_schema],
        description=f"Получение списка всех {forms['genitive_plural']} в формате JSON.",
        dependencies=[Depends(require_role(allowed_roles=get_all_roles))],
    )
    async def get_all(
        service: BaseService = Depends(service_dependency),
    ) -> List[read_schema]:
        try:
            objects = await service.get_all_objects()
            return objects if objects else []
        except Exception as e:
            logger.error(
                f"Ошибка при получении {forms['genitive_plural']}: {traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при получении {forms['genitive_plural']}",
            )

    if has_file_field:

        @router.post(
            "",
            response_model=read_schema,
            status_code=status.HTTP_201_CREATED,
            responses={
                201: {
                    "description": f"{forms['именительный'].capitalize()} успешно создан"
                },
                400: {"description": "Некорректные данные запроса"},
                409: {"description": "Нарушение уникальности ключа"},
                422: {"description": "Ошибка при Валидации"},
                500: {"description": "Внутренняя ошибка сервера"},
            },
            description=f"Создание нового {forms['родительный']} с файлом.",
            dependencies=[Depends(require_role(allowed_roles=create_roles))],
        )
        async def create(
            file: UploadFile, data: str = Form(...), service=Depends(service_dependency)
        ) -> read_schema:
            try:
                if file and file.filename:
                    validate_file_extension(file.filename)
                    
                data_dict = json.loads(data)
                file_content = await file.read()
                data_dict[file_field_name] = file_content
                try:
                    validated_data = create_schema(**data_dict)
                except ValidationError as e:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=e.errors(),
                    )

                result = await service.create_object(validated_data)
                return result
            except IntegrityError as e:
                if isinstance(e.orig, UniqueViolationError):
                    detail = f"{forms['именительный'].capitalize()} с такими данными уже существует"
                    logger.warning(detail)
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT, detail=detail
                    )
                raise
            except HTTPException:
                raise
            except Exception as e:
                logger.error(
                    f"Произошла ошибка при создании {forms['винительный']}: {traceback.format_exc()}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ошибка при создании {forms['родительный']}",
                )

    else:

        @router.post(
            "",
            response_model=read_schema,
            status_code=status.HTTP_201_CREATED,
            responses={
                201: {
                    "description": f"{forms['именительный'].capitalize()} успешно создан"
                },
                400: {"description": "Некорректные данные запроса"},
                409: {"description": "Нарушение уникальности ключа"},
                422: {"description": "Ошибка при Валидации"},
                500: {"description": "Внутренняя ошибка сервера"},
            },
            description=f"Создание нового {forms['родительный']}.",
            dependencies=[Depends(require_role(allowed_roles=create_roles))],
        )
        async def create(
            data: create_schema, service=Depends(service_dependency)
        ) -> read_schema:
            try:
                obj = await service.create_object(data)
                return obj
            except IntegrityError as e:
                if isinstance(e.orig, UniqueViolationError):
                    detail = f"{forms['именительный'].capitalize()} с такими данными уже существует"
                    logger.warning(detail)
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT, detail=detail
                    )
                raise
            except ValueError as e:
                logger.error(
                    f"Произошла ошибка при валидации {forms['винительный']}: {str(e)}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
                )
            except Exception as e:
                logger.error(
                    f"Произошла ошибка при создании {forms['винительный']}: {traceback.format_exc()}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ошибка при создании {forms['родительный']}",
                )

    @router.get(
        "/{obj_id}",
        responses={
            200: {
                "description": f"{forms['именительный'].capitalize()} успешно получен"
            },
            404: {
                "description": f"{forms['именительный'].capitalize()} не {forms['найден']}"
            },
            500: {"description": "Внутренняя ошибка сервера"},
        },
        response_model=read_schema,
        description=f"Получение {forms['родительный']} по идентификатору.",
        dependencies=[Depends(require_role(allowed_roles=get_by_id_roles))],
    )
    @cache(expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder)
    async def get_by_id(
        obj_id: int, service: BaseService = Depends(service_dependency)
    ) -> read_schema:
        try:
            result = await service.get_object_by_id(obj_id)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_206_PARTIAL_CONTENT,
                    detail=f"{forms['именительный'].capitalize()} не {forms['найден']}",
                )
            return result
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Ошибка при получении {forms['винительный']} по ID: {traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при получении {forms['родительный']}",
            )

    if has_file_field:

        @router.put(
            "/{obj_id}",
            response_model=read_schema,
            responses={
                200: {
                    "description": f"{forms['именительный'].capitalize()} успешно обновлен"
                },
                400: {"description": "Некорректные данные запроса"},
                404: {
                    "description": f"{forms['именительный'].capitalize()} не {forms['найден']}"
                },
                422: {"description": "Ошибка при Валидации"},
                500: {"description": "Внутренняя ошибка сервера"},
            },
            description=f"Обновление {forms['родительный']} с файлом.",
            dependencies=[Depends(require_role(allowed_roles=update_roles))],
        )
        async def update(
            obj_id: int,
            file: Optional[UploadFile] = File(None),
            data: Optional[str] = Form(None),
            service=Depends(service_dependency),
        ) -> read_schema:
            try:
                existing_obj = await service.get_object_by_id(obj_id)
                if not existing_obj:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"{forms['именительный'].capitalize()} не {forms['найден']}",
                    )
                
                if file and file.filename:
                    validate_file_extension(file.filename)
                    
                data_dict = {}
                if data:
                    try:
                        data_dict = json.loads(data)
                    except json.JSONDecodeError:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Неверный формат JSON",
                        )
                if file and file.filename:
                    file_content = await file.read()
                    data_dict[file_field_name] = file_content
                try:
                    update_data = update_schema(**data_dict).dict(exclude_unset=True)
                except ValidationError as e:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=e.errors(),
                    )
                result = await service.update_object(obj_id, update_data)
                return result
            except HTTPException:
                raise
            except Exception as e:
                logger.error(
                    f"Ошибка при обновлении {forms['винительный']}: {traceback.format_exc()}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ошибка при обновлении {forms['родительный']}",
                )

    else:

        @router.put(
            "/{obj_id}",
            response_model=read_schema,
            responses={
                200: {
                    "description": f"{forms['именительный'].capitalize()} успешно обновлен"
                },
                400: {"description": "Некорректные данные запроса"},
                404: {
                    "description": f"{forms['именительный'].capitalize()} не {forms['найден']}"
                },
                422: {"description": "Ошибка при Валидации"},
                500: {"description": "Внутреняя ошибка сервера"},
            },
            description=f"Обновление {forms['родительный']}.",
            dependencies=[Depends(require_role(allowed_roles=update_roles))],
        )
        async def update(
            obj_id: int, data: update_schema, service=Depends(service_dependency)
        ) -> read_schema:
            try:
                update_data = data.dict(exclude_unset=True)
                result = await service.update_object(obj_id, update_data)
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"{forms['именительный'].capitalize()} не {forms['найден']}",
                    )
                return result
            except HTTPException:
                raise
            except Exception as e:
                logger.error(
                    f"Ошибка при обновлении {forms['винительный']}: {traceback.format_exc()}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ошибка при обновлении {forms['родительный']}",
                )

    @router.delete(
        "/{obj_id}",
        responses={
            200: {
                "description": f"{forms['именительный'].capitalize()} успешно {forms['удален']}"
            },
            404: {
                "description": f"{forms['именительный'].capitalize()} не {forms['найден']}"
            },
            500: {"description": "Внутренняя ошибка сервера"},
        },
        description=f"Удаление {forms['родительный']}.",
        dependencies=[Depends(require_role(allowed_roles=delete_roles))],
    )
    async def delete(obj_id: int, service=Depends(service_dependency)) -> Dict:
        try:
            success = await service.delete_object(obj_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{forms['именительный'].capitalize()} не {forms['найден']}",
                )
            return {
                "detail": f"{forms['именительный'].capitalize()} успешно {forms['удален']}"
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Ошибка при удалении {forms['винительный']}: {traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при удалении {forms['родительный']}",
            )

    if has_file_field:

        @router.get(
            "/{obj_id}/download",
            responses={
                200: {"description": "Файл успешно скачен"},
                404: {
                    "description": f"{forms['именительный'].capitalize()} не {forms['найден']}"
                },
                500: {"description": "Внутренняя ошибка сервера"},
            },
            description=f"Скачивание файла {forms['родительный']}.",
            response_class=Response,
            dependencies=[Depends(require_role(allowed_roles=download_roles))],
        )
        @cache(
            expire=settings.cache_ttl, coder=Base64Coder, key_builder=custom_key_builder
        )
        async def download_file(obj_id: int, service=Depends(service_dependency)):
            try:
                result = await service.get_object_by_id(obj_id)
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"{forms['именительный'].capitalize()} не {forms['найден']}",
                    )
                file_data = getattr(result, file_field_name)
                file_name = getattr(result, "name", f"{object_name}_{obj_id}")
                encoded_file_name = quote(file_name)
                return Response(
                    content=file_data,
                    headers={
                        "Content-Disposition": f"attachment; filename={encoded_file_name}",
                        "Content-Type": "application/octet-stream",
                        "Access-Control-Expose-Headers": "Content-Disposition",
                    },
                )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(
                    f"Ошибка при скачивании файла {forms['винительный']}: {traceback.format_exc()}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Ошибка при скачивании файла",
                )

    return router