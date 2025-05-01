#!/usr/bin/env bash

export PGPASSWORD=$DB_PASSWORD

echo "Ожидание PostgreSQL..."
until pg_isready -h $DB_HOST -p 5432 -U $DB_USER -d $DB_NAME -t 1; do
    sleep 2
done

echo "Проверка состояния миграций..."

if ! psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version')" | grep -q t; then
    echo "Таблица alembic_version не существует. Инициализация базы данных..."
    echo "Создание начальной миграции..."
    alembic revision --autogenerate -m "initial"
    echo "Применение миграций..."
    alembic upgrade head
    echo "Миграции успешно применены"
else
    CURRENT_VERSION=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT version_num FROM alembic_version LIMIT 1")
    
    if [ -z "$CURRENT_VERSION" ]; then
        echo "Таблица alembic_version пуста. Создание и применение миграции..."
        alembic revision --autogenerate -m "initial"
        alembic upgrade head
    else
        VERSIONS_DIR="alembic/versions"
        VERSION_FILE=$(find $VERSIONS_DIR -name "*${CURRENT_VERSION}*" -type f)
        
        if [ -z "$VERSION_FILE" ]; then
            echo "Ошибка: Файл миграции для версии $CURRENT_VERSION не найден."
            echo "Очистка таблицы alembic_version и создание новой миграции..."
            
            psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "DELETE FROM alembic_version"
            
            echo "Создание новой начальной миграции..."
            alembic revision --autogenerate -m "initial"
            echo "Применение миграции..."
            alembic upgrade head
        else
            echo "Файл миграции для версии $CURRENT_VERSION найден."
            echo "Применение миграций..."
            alembic upgrade head
        fi
    fi
    
    echo "Миграции успешно проверены/применены"
fi

unset PGPASSWORD

echo "Ожидание RabbitMQ..."
until timeout 5 bash -c "cat < /dev/null > /dev/tcp/rabbitmq/5672"; do
    echo "RabbitMQ еще не доступен. Ожидание..."
    sleep 2
done

echo "Ожидание Redis..."
until timeout 5 bash -c "cat < /dev/null > /dev/tcp/redis/6379"; do
    echo "Redis еще не доступен. Ожидание..."
    sleep 2
done

echo "Запуск Celery worker в фоновом режиме..."
celery -A tasks.tasks.celery worker --loglevel=info --detach

echo "Запуск Celery beat в фоновом режиме..."
celery -A tasks.tasks.celery beat --loglevel=info --detach

echo "Запуск основного приложения..."
exec python app.py