import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.db.database import SessionLocal
from app.services.case_statuses import initialize_case_statuses
from app.services.chat import chat_message_cleanup_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize application data and manage background cleanup."""
    db = SessionLocal()
    try:
        initialize_case_statuses(db)
    finally:
        db.close()

    cleanup_task = asyncio.create_task(chat_message_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Case Management API",
    description=(
        "API para gestionar casos, documentos, "
        "asignaciones, usuarios y chat."
    ),
    version="0.3.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


def custom_openapi():
    """Customize OpenAPI schema for Swagger UI file uploads."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["openapi"] = "3.0.3"

    schemas = (
        openapi_schema
        .get("components", {})
        .get("schemas", {})
    )
    for schema in schemas.values():
        properties = schema.get("properties", {})
        for prop in properties.values():
            if prop.get("contentMediaType") == "application/octet-stream":
                prop.pop("contentMediaType", None)
                prop["format"] = "binary"

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
        "version": "0.3.0",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
