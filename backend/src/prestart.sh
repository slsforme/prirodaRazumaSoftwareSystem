#!/usr/bin/env sh

export PGPASSWORD=$DB_PASSWORD

if [ ! -d "./certs" ]; then
    echo "Creating certs folder and generating JWT keys..."
    mkdir -p ./certs
    cd ./certs
    openssl genrsa -out jwt-private.pem 2048
    openssl rsa -in jwt-private.pem -outform PEM -pubout -out jwt-public.pem
    chmod 600 jwt-private.pem  
    cd ..
else
    echo "Certs folder already exists, skipping key generation"
fi

if [ ! -f "./certs/jwt-private.pem" ] || [ ! -f "./certs/jwt-public.pem" ]; then
    echo "ERROR: Missing key files in certs folder!" >&2
    exit 1
fi

# Create the migration directory if it doesn't exist
if [ ! -d "./migration" ]; then
    echo "Creating migration directory..."
    mkdir -p ./migration
fi

# Initialize Alembic in the migration directory
if [ ! -d "./migration/versions" ]; then
    echo "Initial Alembic setup..."
    cd ./migration
    alembic init .
    cd ..
fi

echo "Waiting for PostgreSQL..."
until pg_isready -h $DB_HOST -p 5432 -U $DB_USER -d $DB_NAME -t 1; do
    sleep 2
done

echo "Checking migration status..."

if ! psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version')" | grep -q t; then
    echo "alembic_version table doesn't exist. Initializing database..."
    echo "Creating initial migration..."
    cd ./migration
    alembic revision --autogenerate -m "initial"
    echo "Applying migrations..."
    alembic upgrade head
    cd ..
    echo "Migrations successfully applied"
else
    CURRENT_VERSION=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT version_num FROM alembic_version LIMIT 1")
    
    if [ -z "$CURRENT_VERSION" ]; then
        echo "alembic_version table is empty. Creating and applying migration..."
        cd ./migration
        alembic revision --autogenerate -m "initial"
        alembic upgrade head
        cd ..
    else
        VERSIONS_DIR="./migration/versions"
        VERSION_FILE=$(find $VERSIONS_DIR -name "*${CURRENT_VERSION}*" -type f)
        
        if [ -z "$VERSION_FILE" ]; then
            echo "Error: Migration file for version $CURRENT_VERSION not found."
            echo "Clearing alembic_version table and creating new migration..."
            
            psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "DELETE FROM alembic_version"
            
            echo "Creating new initial migration..."
            cd ./migration
            alembic revision --autogenerate -m "initial"
            echo "Applying migration..."
            alembic upgrade head
            cd ..
        else
            echo "Migration file for version $CURRENT_VERSION found."
            echo "Applying migrations..."
            cd ./migration
            alembic upgrade head
            cd ..
        fi
    fi
    
    echo "Migrations successfully checked/applied"
fi

unset PGPASSWORD

echo "Waiting for RabbitMQ..."
until timeout 5 bash -c "cat < /dev/null > /dev/tcp/rabbitmq/5672"; do
    echo "RabbitMQ is not available yet. Waiting..."
    sleep 2
done

echo "Waiting for Redis..."
until timeout 5 bash -c "cat < /dev/null > /dev/tcp/redis/6379"; do
    echo "Redis is not available yet. Waiting..."
    sleep 2
done

echo "Starting Celery worker in background..."
celery -A tasks.tasks.celery worker --loglevel=info --detach

echo "Starting Celery beat in background..."
celery -A tasks.tasks.celery beat --loglevel=info --detach

echo "Starting main application..."
exec python app.py