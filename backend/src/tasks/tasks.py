from celery import Celery
from celery.schedules import crontab
from celery.utils.log import get_task_logger

from datetime import datetime, timedelta
import subprocess
import os

from config import logger

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

@celery.task(bind=True)
def backup_database(self):
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_dir = "/backups"
        os.makedirs(backup_dir, exist_ok=True)
        
        backup_file = os.path.join(backup_dir, f"backup_{timestamp}.sql")
        
        db_host = os.getenv("DB_HOST")
        db_user = os.getenv("DB_USER")
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
        
        return {
            "status": "success",
            "backup_file": backup_file,
            "task_id": self.request.id  
        }
    except subprocess.CalledProcessError as e:
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise
    except Exception as e:
        logger.error(f"Произошла ошибка при бэкапе Базы Данных: {str(e)}")
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise

celery.conf.beat_schedule = {
    'daily-backup': {
        'task': 'tasks.tasks.backup_database',
        'schedule': timedelta(days=1),
    },
}

if __name__ == "__main__":
    celery.start()
