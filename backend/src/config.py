from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
from loguru import logger

import os
from pathlib import Path
from typing import ClassVar

load_dotenv()

LOG_DIR = "logs/app"
BASE_DIR = Path(__file__).parent

os.makedirs(LOG_DIR, exist_ok=True)


class AuthJWT(BaseModel):
    private_key_path: Path = BASE_DIR / "certs" / "jwt-private.pem"
    public_key_path: Path = BASE_DIR / "certs" / "jwt-public.pem"
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
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
    )
    @property
    def redis_url(self):
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    api_v1_prefix: str = "/api/v1"
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

logger.add(
    os.path.join(LOG_DIR, "log_{time:YYYY-MM-DD}.log"),
    rotation="1 day",
    retention="7 days",
    compression="zip",
    format="{time} {level} {message}",
)
