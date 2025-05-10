from fastapi import (
    FastAPI,
    Depends,
    APIRouter,
    HTTPException,
    status,
    BackgroundTasks,
    Response,
    Security,
)
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from celery.result import AsyncResult
import os
from datetime import datetime
import subprocess
from typing import Optional

from config import logger
from tasks.tasks import celery

router = APIRouter(prefix="/utils", tags=["utils"])

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    try:
        task_result = AsyncResult(task_id, app=celery)
        
        result = task_result.result
        if task_result.status == 'FAILURE':
            if isinstance(result, dict):  
                error_info = {
                    'error_type': result.get('exc_type', 'UnknownError'),
                    'error_message': result.get('exc_message', 'No message'),
                    'details': result.get('custom', '')
                }
            else:  
                error_info = {
                    'error_type': 'UnknownError',
                    'error_message': str(result),
                    'details': 'Необработанная ошибка'
                }
            result = error_info

        return {
            "task_id": task_id,
            "status": task_result.status,
            "result": result,
            "ready": task_result.ready(),
        }
    except Exception as e:
        logger.error(f"Произошла ошибка: {type(e).__name__} - {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")


@router.get("/database/backup")
async def get_database_backup(
    response: Response,
    background_tasks: BackgroundTasks,
):
    try:
        timestamp = datetime.now().strftime("%d_%m_%Y_%H_%M")
        filename = f"dump_{timestamp}.sql"

        backup_dir = "/backups"
        os.makedirs(backup_dir, exist_ok=True)

        backup_file = os.path.join(backup_dir, filename)

        db_host = os.getenv("DB_HOST")
        db_user = os.getenv("DB_USER")
        db_name = os.getenv("DB_NAME")

        cmd = [
            "pg_dump",
            "-h",
            db_host,
            "-U",
            db_user,
            "-d",
            db_name,
            "-f",
            backup_file,
        ]

        env = os.environ.copy()
        env["PGPASSWORD"] = os.getenv("DB_PASSWORD")

        subprocess.run(cmd, check=True, env=env)

        if not os.path.exists(backup_file):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не удалось создать файл бэкапа базы данных",
            )

        with open(backup_file, "rb") as f:
            dump_content = f.read()

        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-Type"] = "application/octet-stream"

        def cleanup_temp_file():
            try:
                if os.path.exists(backup_file):
                    os.remove(backup_file)
            except Exception as e:
                logger.error(f"Ошибка при удалении временного файла бэкапа: {str(e)}")

        background_tasks.add_task(cleanup_temp_file)

        return Response(
            content=dump_content,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/octet-stream",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )

    except subprocess.CalledProcessError as e:
        logger.error(f"Ошибка при выполнении команды pg_dump: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании дампа базы данных: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Произошла ошибка при бэкапе Базы Данных: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании дампа базы данных: {str(e)}",
        )
