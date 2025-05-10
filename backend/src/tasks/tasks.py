import aiohttp
from celery import Celery
from celery.schedules import crontab
from celery.utils.log import get_task_logger
from dotenv import load_dotenv

import asyncio
from datetime import datetime, timedelta
import subprocess
import os
import glob

from yadisk.utils import (
    ensure_yandex_folder_exists,
    get_files_list,
    delete_old_files,
    async_upload_to_yandex_disk
)

load_dotenv()

logger = get_task_logger(__name__)

celery = Celery(
    __name__,
    broker=os.getenv("CELERY_BROKER_URL"),
    backend=os.getenv("CELERY_BACKEND_URL")
)

celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Moscow',
    result_expires=3600,
    task_track_started=True,
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    task_default_queue="default"
)

def clean_old_local_backups(backup_dir: str, keep_count: int = 7):
    try:
        files = glob.glob(os.path.join(backup_dir, "backup_*.sql"))
        
        files.sort(key=os.path.getmtime, reverse=True)
        
        if len(files) <= keep_count:
            logger.info(f"Локальных файлов меньше {keep_count}, удаление не требуется")
            return

        for old_file in files[keep_count:]:
            try:
                os.remove(old_file)
                logger.info(f"Удален локальный файл: {os.path.basename(old_file)}")
            except Exception as e:
                logger.error(f"Ошибка удаления {old_file}: {str(e)}")

    except Exception as e:
        logger.error(f"Ошибка очистки локальных бэкапов: {str(e)}")
        raise


@celery.task(bind=True)
def backup_database(self):
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_dir = "/backups"
        os.makedirs(backup_dir, exist_ok=True)
        
        clean_old_local_backups(backup_dir)
        
        backup_file = os.path.join(backup_dir, f"backup_{timestamp}.sql")
        
        db_host = os.getenv("DB_HOST")
        db_user = os.getenv("POSTGRES_USER")
        db_name = os.getenv("DB_NAME")
        
        cmd = [
            "pg_dump",
            "-h", db_host,
            "-U", db_user,
            "-d", db_name,
            "-f", backup_file
        ]
        
        env = os.environ.copy()
        env["PGPASSWORD"] = os.getenv("DB_PASSWORD")
        
        subprocess.run(cmd, check=True, env=env)
        
        yandex_folder = os.getenv("YANDEX_BACKUP_FOLDER", "backups")
        remote_filename = f"backup_{timestamp}.sql"
        remote_path = f"/{yandex_folder}/{remote_filename}"
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        upload_result = loop.run_until_complete(
            async_upload_to_yandex_disk(backup_file, remote_path)
        )
        loop.close()
        
        return {
            "status": "success",
            "local_backup": backup_file,
            "yandex_disk": upload_result,
            "task_id": self.request.id
        }
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Ошибка при создании бэкапа: {str(e)}")
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise
    except Exception as e:
        logger.error(f"Общая ошибка: {str(e)}")
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise

celery.conf.beat_schedule = {
    'daily-backup': {
        'task': 'tasks.tasks.backup_database',
        'schedule': timedelta(days=1),
    },
}

if __name__ == '__main__':
    celery.start()