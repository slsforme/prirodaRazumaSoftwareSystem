from .base import create_base_router
from schemas.documents import *
from depends import get_document_service

router = create_base_router(
    prefix="/documents",
    tags=["documents"],
    service_dependency=get_document_service,
    create_schema=DocumentCreate,
    read_schema=DocumentInDB,
    update_schema=DocumentUpdate,
    object_name="документ",
    gender="m",
    has_file_field=True,
    file_field_name="data",
    get_all_roles={1, 2, 3},
    get_by_id_roles={1, 2, 3},
    create_roles={1, 2, 3},
    update_roles={1, 2, 3},
    delete_roles={1, 2, 3},
    download_roles={1, 2, 3},
)
