
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.case_comment import CaseComment
from app.models.case_comment_history import CaseCommentHistory
from app.models.user import User


def save_comment_version(
    db: Session,
    comment: CaseComment,
    user: User,
    action: str,
) -> CaseCommentHistory:

    history = CaseCommentHistory(
        comment_id=comment.id,
        user_id=user.id,
        version=comment.history_version,
        action=action,
        content=comment.content,
    )

    db.add(history)

    return history


def get_next_version(
    db: Session,
    comment_id: UUID,
) -> int:

    current_version = db.scalar(
        select(
            func.max(CaseCommentHistory.version)
        ).where(
            CaseCommentHistory.comment_id == comment_id
        )
    )

    return (current_version or 0) + 1


def get_comments_by_case(
    db: Session,
    case_id: UUID,
    skip: int = 0,
    limit: int = 50,
) -> list[CaseComment]:

    statement = (
        select(CaseComment)
        .where(
            CaseComment.case_id == case_id,
            CaseComment.is_deleted.is_(False),
        )
        .order_by(
            CaseComment.created_at.asc(),
            CaseComment.id.asc(),
        )
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


def create_comment(
    db: Session,
    case_id: UUID,
    current_user: User,
    content: str,
) -> CaseComment:

    try:
        comment = CaseComment(
            case_id=case_id,
            user_id=current_user.id,
            content=content,
        )

        db.add(comment)
        db.flush()

        history = CaseCommentHistory(
            comment_id=comment.id,
            user_id=current_user.id,
            version=1,
            action="CREATED",
            content=content,
        )

        db.add(history)

        db.commit()
        db.refresh(comment)

        return comment

    except Exception:
        db.rollback()
        raise


def update_comment(
    db: Session,
    comment: CaseComment,
    current_user: User,
    content: str,
) -> CaseComment:

    try:
        next_version = get_next_version(
            db,
            comment.id,
        )

        comment.content = content

        db.flush()

        history = CaseCommentHistory(
            comment_id=comment.id,
            user_id=current_user.id,
            version=next_version,
            action="UPDATED",
            content=content,
        )

        db.add(history)

        db.commit()
        db.refresh(comment)

        return comment

    except Exception:
        db.rollback()
        raise


def delete_comment(
    db: Session,
    comment: CaseComment,
    current_user: User,
) -> CaseComment:

    try:
        next_version = get_next_version(
            db,
            comment.id,
        )

        comment.is_deleted = True

        db.flush()

        history = CaseCommentHistory(
            comment_id=comment.id,
            user_id=current_user.id,
            version=next_version,
            action="DELETED",
            content=comment.content,
        )

        db.add(history)

        db.commit()
        db.refresh(comment)

        return comment

    except Exception:
        db.rollback()
        raise


def get_comment_history(
    db: Session,
    comment_id: UUID,
) -> list[CaseCommentHistory]:

    statement = (
        select(CaseCommentHistory)
        .where(
            CaseCommentHistory.comment_id == comment_id
        )
        .order_by(
            CaseCommentHistory.version.asc()
        )
    )

    return list(db.scalars(statement).all())
