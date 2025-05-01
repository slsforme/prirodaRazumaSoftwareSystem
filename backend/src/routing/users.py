from fastapi import APIRouter, Depends, status, HTTPException, File, UploadFile
from fastapi.responses import FileResponse
from pathlib import Path
from uuid import uuid4
import shutil
from depends import get_user_service
from schemas.users import *
from config import settings, logger
from .base import create_base_router
from auth.auth import require_role

router = create_base_router(
    prefix="/users",
    tags=["Users"],
    service_dependency=get_user_service,
    create_schema=UserCreate,
    read_schema=UserInDB,
    update_schema=UserUpdate,
    object_name="пользователь",
    gender="m",
    get_all_roles={1, 2, 3},  
    get_by_id_roles={1, 2, 3}, 
    create_roles={1},
    update_roles={1, 2, 3},  
    delete_roles={1},  
)

PHOTO_STORAGE = Path("uploads/users/photos")
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"]
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

@router.post(
    "/{user_id}/photo",
    response_model=UserInDB,
    responses={
        200: {"description": "Фото успешно обновлено"},
        404: {"description": "Пользователь не найден"},
        415: {"description": "Неподдерживаемый формат файла"},
        500: {"description": "Ошибка загрузки файла"},
    },
    dependencies=[Depends(require_role(allowed_roles={1, 2, 3}))],  
)
async def upload_user_photo(
    user_id: int, photo: UploadFile = File(...), service=Depends(get_user_service)
):
    if photo.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Поддерживаются только JPEG, JPG и PNG форматы",
        )

    file_ext = Path(photo.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Некорректное расширение файла",
        )

    user = await service.get_object_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
        )

    try:
        PHOTO_STORAGE.mkdir(parents=True, exist_ok=True)

        if user.photo_url:
            old_photo = PHOTO_STORAGE / Path(user.photo_url).name
            if old_photo.exists():
                old_photo.unlink()

        filename = f"{uuid4()}{file_ext}"
        file_path = PHOTO_STORAGE / filename

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        return await service.update_object(
            user_id, {"photo_url": str(file_path.relative_to("uploads"))}
        )

    except Exception as e:
        logger.error(f"Ошибка загрузки фото: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при загрузке файла",
        )

@router.get(
    "/{user_id}/photo",
    responses={
        200: {
            "content": {"image/jpeg": {}, "image/png": {}},
            "description": "Фото пользователя",
        },
        404: {"description": "Фото не найдено"},
    },
    description="Получение фотографии пользователя по ID",
    dependencies=[Depends(require_role(allowed_roles={1, 2, 3}))],  
)
async def get_user_photo(user_id: int, service=Depends(get_user_service)):
    user = await service.get_object_by_id(user_id)
    if not user or not user.photo_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено"
        )

    try:
        photo_path = PHOTO_STORAGE / Path(user.photo_url).name
        if not photo_path.exists():
            logger.error(f"Файл {photo_path} не найден на диске")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Файл фото не найден"
            )

        return FileResponse(
            photo_path,
            media_type="image/jpeg" if photo_path.suffix == ".jpg" else "image/png",
            headers={"Cache-Control": "public, max-age=604800"},
        )

    except Exception as e:
        logger.error(f"Ошибка при получении фото: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении файла",
        )

@router.delete(
    "/{user_id}/photo",
    response_model=UserInDB,
    responses={
        200: {"description": "Фото удалено"},
        404: {"description": "Пользователь не найден"},
        500: {"description": "Ошибка удаления файла"},
    },
    dependencies=[Depends(require_role(allowed_roles={1, 2, 3}))],  
)
async def delete_user_photo(user_id: int, service=Depends(get_user_service)):
    user = await service.get_object_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
        )

    if user.photo_url:
        try:
            photo_path = PHOTO_STORAGE / Path(user.photo_url).name
            if photo_path.exists():
                photo_path.unlink()
        except Exception as e:
            logger.error(f"Ошибка удаления файла: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении файла",
            )

    return await service.update_object(user_id, {"photo_url": None})
