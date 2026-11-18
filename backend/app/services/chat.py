import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.chat_message import ChatMessage


logger = logging.getLogger(__name__)


def purge_expired_chat_messages() -> int:
    """Delete messages whose 24-hour retention period has ended."""
    db: Session = SessionLocal()
    try:
        result = db.execute(
            delete(ChatMessage).where(
                ChatMessage.expires_at <= datetime.now(timezone.utc)
            )
        )
        db.commit()
        return result.rowcount or 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def chat_message_cleanup_loop() -> None:
    """Periodically purge expired messages; visibility expires at 24 hours."""
    while True:
        await asyncio.sleep(60)
        try:
            await asyncio.to_thread(purge_expired_chat_messages)
        except Exception:
            logger.exception("Could not purge expired chat messages")
