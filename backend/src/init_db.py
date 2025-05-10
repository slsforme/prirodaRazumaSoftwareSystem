from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker
from sqlalchemy import select
import bcrypt
import os

from models.models import User, Role
from auth.utils import hash_password
from config import logger


async def init_db(engine: AsyncEngine):
    try:
        async_session = async_sessionmaker(engine, expire_on_commit=False)

        async with async_session() as session:
            roles = [{"name": "Администратор"}, {"name": "Педагог"}]

            for role_data in roles:
                result = await session.execute(
                    select(Role).where(Role.name == role_data["name"])
                )
                if not result.scalar_one_or_none():
                    session.add(Role(**role_data))
                    logger.debug(f"Добавлена роль: {role_data['name']}")

            await session.commit()

            admin_role = await session.execute(select(Role).where(Role.id == 1))

            admin_role = admin_role.scalar_one()

            admin_login = "admin123"
            admin_password = "admin123"

            admin_exists = await session.execute(
                select(User).where(User.role_id == admin_role.id)
            )

            if admin_exists.scalar_one_or_none():
                logger.info("Администратор уже существует")
                return

            role_result = await session.execute(
                select(Role).where(Role.name == "Администратор")
            )
            admin_role = role_result.scalar_one()

            hashed_password = hash_password(admin_password)

            admin = User(
                login=admin_login,
                password=hashed_password,
                fio="Фамилия Имя Отчество",
                role_id=admin_role.id,
                active=True,
            )

            session.add(admin)
            await session.commit()
            logger.info("Администратор успешно создан")

    except Exception as e:
        logger.error(f"Ошибка при инициализации БД: {e}")
        await session.rollback()
        raise
