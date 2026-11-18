from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.roles import UserRole
from app.db.database import get_db
from app.models.chat_message import ChatMessage
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageRead, ChatRoom


router = APIRouter(prefix="/chat", tags=["Chat"])
MESSAGE_RETENTION = timedelta(hours=24)


def require_room_access(room: ChatRoom, user: User) -> None:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if room == ChatRoom.MANAGEMENT and role not in {
        UserRole.MANAGER.value,
        UserRole.ADMIN.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This chat is only available to managers and administrators.",
        )


@router.get("/{room}/messages", response_model=list[ChatMessageRead])
def list_messages(
    room: ChatRoom,
    limit: int = Query(default=100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChatMessage]:
    require_room_access(room, current_user)
    now = datetime.now(timezone.utc)

    statement = (
        select(ChatMessage)
        .where(
            ChatMessage.room == room.value,
            ChatMessage.expires_at > now,
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(db.scalars(statement).all())
    return list(reversed(messages))


@router.post(
    "/{room}/messages",
    response_model=ChatMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    room: ChatRoom,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatMessage:
    require_room_access(room, current_user)
    now = datetime.now(timezone.utc)
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    message = ChatMessage(
        room=room.value,
        author_id=current_user.id,
        author_name=current_user.full_name,
        author_role=role,
        content=payload.content,
        created_at=now,
        expires_at=now + MESSAGE_RETENTION,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
