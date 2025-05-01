from prometheus_client import Counter, Gauge, Histogram, generate_latest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, text
from fastapi import Request
from fastapi.responses import PlainTextResponse
from influxdb_client import InfluxDBClient
from influxdb_client.client.write_api import SYNCHRONOUS
import psutil

from datetime import datetime, timedelta
import asyncio
import time

from models.models import User, Document, Patient, Role
from config import logger

INFLUX_SETTINGS = {
    "url": "http://localhost:8086",
    "token": "qAzAsp68NqybUlpOOgCRREDIuV6OD8bH8wOHJNiiflKBlNhB80jTCHE05d7zIqKGxe79-eZSc-uW0mss0TxlZQ==",
    "org": "Priroda Razuma",
    "bucket": "metrics-app"
}

influx_client = InfluxDBClient(
    url=INFLUX_SETTINGS["url"],
    token=INFLUX_SETTINGS["token"],
    org=INFLUX_SETTINGS["org"]
)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

async def write_influx_point(measurement: str, fields: dict, tags: dict = None):
    point = {
        "measurement": measurement,
        "tags": tags or {},
        "fields": fields,
        "time": datetime.utcnow()
    }
    try:
        await asyncio.to_thread(
            write_api.write,
            bucket=INFLUX_SETTINGS["bucket"],
            record=point
        )
        logger.info(f"Успешно записаны данные: {point}")
    except Exception as e:
        logger.error(f"Ошибка при выгрузке данных в InfluxDB: {str(e)}")
        raise 

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP Requests",
    ["method", "endpoint", "status_code"],
)

DAU = Gauge("dau", "Daily Active Users")
DOCUMENTS_TOTAL = Gauge("documents_total", "Total uploaded documents")
DOCUMENTS_BY_TYPE = Counter(
    "documents_by_type", "Documents count by category", ["document_type"]
)

DB_ACTIVE_CONNECTIONS = Gauge(
    "db_active_connections", "Active database connections"
)

DB_RESPONSE_TIME = Histogram(
    "db_query_duration_seconds",
    "Database query duration distribution",
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
)

APP_HEALTH = Gauge(
    "app_health", "Application health status (1 = healthy, 0 = unhealthy)"
)

HTTP_ERRORS = Counter(
    "http_errors_total",
    "HTTP errors count",
    ["method", "endpoint", "status_code"],
)

AVG_PATIENT_AGE = Gauge("patient_avg_age", "Average patient age")

USERS_BY_ROLE = Gauge("users_by_role", "Users count by role", ["role_name"])

PATIENTS_AGE_DISTRIBUTION = Histogram(
    "patients_age_distribution",
    "Patients age distribution",
    buckets=[0, 3, 6, 9, 12, 15, 18],
)

NEW_PATIENTS_TOTAL = Counter(
    "new_patients_registered_total", "New patients registered"
)

API_RESPONSE_TIME = Histogram(
    "api_response_time_seconds",
    "API response time distribution",
    ["method", "endpoint", "status_code"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
)

SYSTEM_MEMORY = Gauge(
    "system_memory_usage_percent",
    "System memory usage percentage",
    ["memory_type"]
)

CPU_USAGE = Gauge(
    "system_cpu_usage_percent",
    "System CPU usage percentage",
    ["cpu_core"]
)

async def update_metrics(session: AsyncSession):
    try:
        start_time = time.time()
        await session.execute(text("SELECT 1"))
        db_response_time = time.time() - start_time
        
        await write_influx_point(
            "database_health",
            {"response_time_seconds": db_response_time},
            {"check_type": "connectivity"}
        )
        DB_RESPONSE_TIME.observe(db_response_time)

        connections = await session.execute(
            text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
        )
        active_connections = connections.scalar()
        await write_influx_point(
            "database_connections",
            {"active": active_connections},
            {"metric": "current"}
        )
        DB_ACTIVE_CONNECTIONS.set(active_connections)

        mem = await asyncio.to_thread(psutil.virtual_memory)
        swap = await asyncio.to_thread(psutil.swap_memory)

        await write_influx_point(
            "system_memory",
            {"used_percent": mem.percent},
            {"name": "RAM"},
        )
        SYSTEM_MEMORY.labels(memory_type="physical").set(mem.percent)

        await write_influx_point(
            "system_memory",
            {"used_percent": swap.percent},
            {"name": "Swap"},

        )
        SYSTEM_MEMORY.labels(memory_type="swap").set(swap.percent)

        cpu_percent = await asyncio.to_thread(psutil.cpu_percent, interval=1, percpu=True)
        for idx, usage in enumerate(cpu_percent):
            core_number = idx + 1  
            await write_influx_point(
                "system_cpu",
                {"usage_percent": usage},
                {
                    "core": str(core_number),
                    "name": f"Ядро {core_number}"  
                }
            )
            CPU_USAGE.labels(cpu_core=str(core_number)).set(usage)

        total_cpu = sum(cpu_percent) / len(cpu_percent)
        await write_influx_point(
            "system_cpu",
            {"usage_percent": total_cpu},
            {
                "core": "total",
                "name": "Все ядра"
            }
        )
        CPU_USAGE.labels(cpu_core="total").set(total_cpu)

        active_users = await session.execute(
            select(func.count(User.id)).where(User.active == True)
        )
        dau_value = active_users.scalar()
        await write_influx_point("users", {"dau": dau_value}, {"type": "daily_active"})
        DAU.set(dau_value)
        APP_HEALTH.set(1 if dau_value is not None else 0)

        new_patients = await session.execute(
            select(func.count(Patient.id)).where(
                Patient.created_at >= datetime.now() - timedelta(hours=1)
            )
        )
        new_patients_count = new_patients.scalar()
        await write_influx_point("patients", {"new_registrations": new_patients_count}, {"type": "hourly"})
        NEW_PATIENTS_TOTAL.inc(new_patients_count)

        patients = await session.execute(select(Patient))
        ages = []
        for patient in patients.scalars():
            PATIENTS_AGE_DISTRIBUTION.observe(patient.age)
            ages.append(patient.age)
        
        if ages:
            avg_age = sum(ages) / len(ages)
            await write_influx_point("patients_age", {"average": avg_age}, {"metric": "mean"})
            AVG_PATIENT_AGE.set(avg_age)

            buckets = [0, 3, 6, 9, 12, 15, 18]
            age_counts = {f"{buckets[i]}-{buckets[i+1]}": 0 for i in range(len(buckets)-1)}
            for age in ages:
                for i in range(len(buckets)-1):
                    if buckets[i] <= age < buckets[i+1]:
                        age_counts[f"{buckets[i]}-{buckets[i+1]}"] += 1
                        break
            
            for bucket, count in age_counts.items():
                await write_influx_point(
                    "patients_age_groups",
                    {"count": count},
                    {"age_group": bucket}
                )

        roles = await session.execute(
            select(Role.name, func.count(User.id)).join(User).group_by(Role.name)
        )
        for role_name, count in roles:
            await write_influx_point(
                "user_roles",
                {"count": count},
                {"role": role_name}
            )
            USERS_BY_ROLE.labels(role_name=role_name).set(count)

        total_docs = await session.execute(select(func.count(Document.id)))
        total_docs_count = total_docs.scalar()
        await write_influx_point("documents", {"total": total_docs_count}, {"type": "all"})
        DOCUMENTS_TOTAL.set(total_docs_count)

        docs_by_type = await session.execute(
            select(Document.subdirectory_type, func.count(Document.id)).group_by(
                Document.subdirectory_type
            )
        )
        for doc_type, count in docs_by_type:
            await write_influx_point(
                "document_types",
                {"count": count},
                {"type": doc_type.value}
            )
            DOCUMENTS_BY_TYPE.labels(document_type=doc_type.value).inc(count)

    except Exception as e:
        await write_influx_point("app_health", {"status": 0}, {"error": str(e)})
        APP_HEALTH.set(0)
        raise

def get_metrics(request: Request):
    return PlainTextResponse(generate_latest(), media_type="text/plain")