#!/usr/bin/env sh

set -x

export PGPASSWORD=$DB_PASSWORD

echo "Текущая директория: $(pwd)"
echo "Содержимое текущей директории: $(ls -la)"

if [ ! -d "./certs" ]; then
    echo "Создание папки certs и генерация JWT ключей..."
    mkdir -p ./certs
    cd ./certs
    openssl genrsa -out jwt-private.pem 2048
    openssl rsa -in jwt-private.pem -outform PEM -pubout -out jwt-public.pem
    chmod 600 jwt-private.pem  
    cd ..
else
    echo "Папка certs уже существует, пропуск генерации ключей"
    echo "Содержимое папки certs: $(ls -la ./certs)"
fi

if [ ! -f "./certs/jwt-private.pem" ] || [ ! -f "./certs/jwt-public.pem" ]; then
    echo "ОШИБКА: Отсутствуют файлы ключей в папке certs!" >&2
    exit 1
fi

echo "Проверка структуры директорий Alembic..."
if [ ! -d "./alembic" ]; then
    echo "ПРЕДУПРЕЖДЕНИЕ: Папка alembic не существует, создаю..."
    mkdir -p ./alembic/versions
fi

if [ ! -d "./alembic/versions" ]; then
    echo "ПРЕДУПРЕЖДЕНИЕ: Папка alembic/versions не существует, создаю..."
    mkdir -p ./alembic/versions
fi

echo "Содержимое папки alembic: $(ls -la ./alembic)"

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
        VERSION_FILE=$(find $VERSIONS_DIR -name "*${CURRENT_VERSION}*" -type f 2>/dev/null)
        
        if [ -z "$VERSION_FILE" ]; then
            echo "Версия миграции $CURRENT_VERSION не найдена в файлах."
            echo "Содержимое директории миграций: $(ls -la $VERSIONS_DIR)"
            
            echo "Очистка таблицы alembic_version и создание новой миграции..."
            psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "DELETE FROM alembic_version"
            
            echo "Создание новой начальной миграции..."
            alembic revision --autogenerate -m "initial"
            echo "Применение миграции..."
            alembic upgrade head
        else
            echo "Файл миграции для версии $CURRENT_VERSION найден: $VERSION_FILE"
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