FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    openssl \
    postgresql-client && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY src/ .

RUN mkdir -p /app/alembic/versions

EXPOSE 8000

RUN chmod +x prestart.sh

ENTRYPOINT [ "./prestart.sh" ]