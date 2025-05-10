from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from loguru import logger
import logging
import os
import sys
from pathlib import Path
from typing import ClassVar


class InterceptHandler(logging.Handler):
    def emit(self, record):
        logger_opt = logger.opt(depth=6, exception=record.exc_info)
        logger_opt.log(record.levelname, record.getMessage())

def setup_logging():
    logger.remove()
    
    logger.add(
        sink=sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{module}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG",
        backtrace=True,
        diagnose=True,
        colorize=True,
        filter=lambda record: "change detected" not in record["message"] 
    )
    
    LOG_DIR = "logs/app"
    BASE_DIR = Path(__file__).parent
    os.makedirs(LOG_DIR, exist_ok=True)
    
    logger.add(
        os.path.join(LOG_DIR, "log_{time:YYYY-MM-DD}.log"),
        rotation="1 day",
        retention="7 days",
        compression="zip",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {module}:{function}:{line} - {message}",
        level="INFO",  
        enqueue=True,
        delay=True,     
        catch=True      
    )
    
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    logging.getLogger("uvicorn.access").handlers = [InterceptHandler()]
    logging.getLogger("uvicorn.error").handlers = [InterceptHandler()]

setup_logging()

__all__ = ['logger']

class AuthJWT(BaseModel):
    private_key_path: Path = Path(__file__).parent / "certs" / "jwt-private.pem"
    public_key_path: Path = Path(__file__).parent / "certs" / "jwt-public.pem"
    algorithm: str = "RS256"
    access_token_expire_minutes: int = 15

class Settings(BaseSettings):
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    REDIS_PASSWORD: str
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    @property
    def redis_url(self):
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    api_v1_prefix: str = "/v1"
    port: ClassVar[int] = 8000
    host: ClassVar[str] = "0.0.0.0"
    log_level: ClassVar[str] = "info"
    auth_jwt: ClassVar[AuthJWT] = AuthJWT()
    cache_ttl: ClassVar[int] = 3600
    server_ip: ClassVar[str] = "5.129.196.88"

    def get_db_url(self):
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

settings = Settings()