
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.api.v1.router import api_router
from app.db.database import SessionLocal
from app.services.case_statuses import initialize_case_statuses



@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    """

    # Initialize default case statuses
    db = SessionLocal()

    try:
        initialize_case_statuses(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="Case Management API",
    description=(
        "API para gestionar casos, documentos, "
        "asignaciones y usuarios."
    ),
    version="0.2.0",
    lifespan=lifespan,
)


app.include_router(api_router)

def custom_openapi():
    """
    Customize OpenAPI schema to make Swagger UI
    recognize uploaded files as binary files.

    Compatibility workaround for FastAPI 0.129.1+
    and Swagger UI array file upload rendering.
    """

    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Use OpenAPI 3.0.3 for Swagger UI file picker compatibility.
    openapi_schema["openapi"] = "3.0.3"

    schemas = (
        openapi_schema
        .get("components", {})
        .get("schemas", {})
    )

    for schema in schemas.values():

        properties = schema.get("properties", {})

        for prop in properties.values():

            # Handle single file uploads.
            if prop.get("contentMediaType") == "application/octet-stream":
                prop.pop("contentMediaType", None)
                prop["format"] = "binary"

            # Handle multiple file uploads.
            items = prop.get("items", {})

            if (
                isinstance(items, dict)
                and items.get("contentMediaType") == "application/octet-stream"
            ):
                items.pop("contentMediaType", None)
                items["type"] = "string"
                items["format"] = "binary"

    app.openapi_schema = openapi_schema

    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "message": "Case Management API",
        "version": "0.2.0",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
