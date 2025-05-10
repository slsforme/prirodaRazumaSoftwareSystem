from fastapi import (
    APIRouter,
    Depends,
    Form,
    HTTPException,
    status,
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt

from depends import get_user_service, get_role_service
from services.users import UserService
from services.roles import RoleService
from .utils import validate_password, encode_jwt, decode_jwt, hash_password
from models.models import User
from .schema import *

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_service: UserService = Depends(get_user_service),
) -> User:
    try:
        payload = decode_jwt(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен просрочился",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_service.get_object_by_login(payload.get("sub"))

    if not user or not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь неактивен или удалён из системы",
        )
    return user


def require_role(allowed_roles: set[int] = None, min_role_id: int = None):
    async def role_checker(
        user: User = Depends(get_current_user),
        user_service: UserService = Depends(get_user_service),
    ):
        fresh_user = await user_service.get_object_by_login(user.login)

        if not fresh_user or not fresh_user.active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Учетная запись деактивирована",
            )

        if allowed_roles is not None and fresh_user.role_id not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения действия",
            )

        if min_role_id is not None and fresh_user.role_id < min_role_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения действия",
            )

        return fresh_user

    return role_checker


@router.post(
    "/login",
    response_model=Token,
    description=f"Авторизация",
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends(get_user_service),
):
    user = await user_service.get_object_by_login(form_data.username)

    if not user or not validate_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные данные для входа",
        )

    access_token_data = {
        "sub": user.login,
        "user_id": user.id,
        "role_id": user.role_id,
        "type": "access",
    }

    refresh_token_data = {
        "sub": user.login,
        "type": "refresh",
    }

    access_token = encode_jwt(access_token_data)
    refresh_token = encode_jwt(refresh_token_data, expire_timedelta=timedelta(days=7))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "user_id": user.id,
    }


@router.post(
    "/refresh",
    response_model=Token,
    description=f"Обновление access token",
)
async def refresh_token(
    refresh_token: str = Form(...),
    user_service: UserService = Depends(get_user_service),
):
    try:
        payload = decode_jwt(refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh токен просрочен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный тип токена",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_service.get_object_by_login(payload.get("sub"))
    if not user or not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь деактивирован или удалён из системы",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_data = {
        "sub": user.login,
        "user_id": user.id,
        "role_id": user.role_id,
        "type": "access",
    }
    new_access_token = encode_jwt(
        access_token_data, expire_timedelta=timedelta(minutes=15)
    )

    new_refresh_token = encode_jwt(
        {"sub": user.login, "type": "refresh"}, expire_timedelta=timedelta(days=7)
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "Bearer",
        "user_id": user.id,
    }
