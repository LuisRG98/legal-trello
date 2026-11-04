from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    cases,
    comments,
    documents,
    users,
)


api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(cases.router)
api_router.include_router(documents.router)
api_router.include_router(comments.router)