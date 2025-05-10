from fastapi import FastAPI, Depends, APIRouter, HTTPException, status, Request
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi_cache.backends.redis import RedisBackend
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi_cache import FastAPICache
from celery.result import AsyncResult
from redis import asyncio as aioredis
import uvicorn

from typing import AsyncGenerator

from auth.auth import router as auth_router, get_current_user
from routing.documents import router as documents_routing
from routing.analytics import router as analytics_routing
from routing.patients import router as patients_routing
from routing.users import router as user_routing
from routing.roles import router as role_routing
from routing.helper import router as helper_routing
from tasks.tasks import celery, backup_database
from config import settings, logger
from init_db import init_db
from db.db import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        logger.info("Инициализация приложения")
        logger.info("Инициализация Redis кэша...")
        redis = aioredis.from_url(
            settings.redis_url, encoding="utf8", decode_responses=True
        )
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        logger.info("Redis кэш инициализирован")

        logger.info("Инициализация базы данных...")
        await init_db(engine)
        logger.info("База данных инициализирована")

        logger.info("Запуск начального бэкапа базы данных...")
        try:
            task = backup_database.delay()
            logger.info(f"Задача бэкапа запущена. ID задачи: {task.id}")
        except Exception as e:
            logger.error(f"Ошибка при запуске задачи бэкапа: {e}")

        yield

        logger.info("Завершение работы приложения")
        await FastAPICache.clear()
        logger.info("Redis кэш очищен")
        await engine.dispose()
        logger.info("Соединение с базой данных закрыто")
    except Exception as e:
        logger.error(f"Произошла ошибка при инициализации приложения: {e}")


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    title="Priroda Razuma API",
    description="Документация для системы детского нейроцентра 'Природа Разума'",
    version="1.0.0",
)


@app.get(f"{settings.api_v1_prefix}/docs", include_in_schema=False)
async def custom_swagger_ui_html(request: Request):
    root_path = request.scope.get("root_path", "").rstrip("/")
    openapi_url = f"{root_path}{settings.api_v1_prefix}/openapi.json"
    return get_swagger_ui_html(
        openapi_url=openapi_url,
        title=app.title + " - Swagger UI",
        swagger_favicon_url="https://prirodarazyma.ru/wp-content/uploads/2024/11/logo_simbol-black-1.svg",
        swagger_ui_parameters={
            "syntaxHighlight.theme": "obsidian",
        },
    )


@app.get(f"{settings.api_v1_prefix}/redoc", include_in_schema=False)
async def redoc_html(request: Request):
    root_path = request.scope.get("root_path", "").rstrip("/")
    openapi_url = f"{root_path}{settings.api_v1_prefix}/openapi.json"
    return get_redoc_html(
        openapi_url=openapi_url,
        title=app.title + " - ReDoc",
        redoc_favicon_url="https://prirodarazyma.ru/wp-content/uploads/2024/11/logo_simbol-black-1.svg",
    )



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://{settings.server_ip}:3000",
        f"http://{settings.server_ip}:8080",
        f"http://{settings.server_ip}",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

protected_router = APIRouter(
    prefix=settings.api_v1_prefix,
    dependencies=[Depends(get_current_user)],
)

protected_router.include_router(user_routing)
protected_router.include_router(role_routing)
protected_router.include_router(patients_routing)
protected_router.include_router(documents_routing)
protected_router.include_router(analytics_routing)
protected_router.include_router(helper_routing)

app.include_router(protected_router)
app.include_router(auth_router, prefix=settings.api_v1_prefix)

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level,
    )
