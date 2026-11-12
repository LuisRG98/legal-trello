from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.case_comment import CaseComment
from app.models.case_comment_history import CaseCommentHistory
from app.models.user import User

from app.services.activity import record_case_activity


def get_next_version(
    db: Session,
    comment_id: UUID,
) -> int:
    """
    Obtiene el siguiente número de versión de un comentario.

    Debe ejecutarse después de bloquear la fila del comentario
    mediante SELECT FOR UPDATE.
    """

    current_version = db.scalar(
        select(
            func.max(CaseCommentHistory.version)
        ).where(
            CaseCommentHistory.comment_id == comment_id
        )
    )

    return (current_version or 0) + 1


def get_locked_comment(
    db: Session,
    comment_id: UUID,
) -> CaseComment:
    """
    Recupera un comentario bloqueando su fila durante
    la transacción actual.
    """

    statement = (
        select(CaseComment)
        .where(CaseComment.id == comment_id)
        .with_for_update()
    )

    comment = db.scalar(statement)

    if comment is None:
        raise ValueError("Comment not found.")

    return comment


def get_comments_by_case(
    db: Session,
    case_id: UUID,
    skip: int = 0,
    limit: int = 50,
) -> list[CaseComment]:
    """
    Obtiene los comentarios no eliminados de un caso.

    Incluye el usuario para evitar consultas adicionales
    al mostrar el autor de cada comentario.
    """

    statement = (
        select(CaseComment)
        .options(
            selectinload(CaseComment.user),
        )
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
    """
    Crea un comentario y registra su primera versión
    dentro de una única transacción.
    """

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
        record_case_activity(
            db,
            case_id=case_id,
            actor_id=current_user.id,
            action="COMMENT_CREATED",
            new_value={
                "comment_id": str(comment.id),
            },
        )
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
    """
    Actualiza un comentario y registra una nueva versión.

    El bloqueo evita que dos modificaciones simultáneas
    generen el mismo número de versión.
    """

    try:
        locked_comment = get_locked_comment(
            db,
            comment.id,
        )

        if locked_comment.is_deleted:
            raise ValueError("Cannot update a deleted comment.")

        next_version = get_next_version(
            db,
            locked_comment.id,
        )

        locked_comment.content = content

        db.flush()

        history = CaseCommentHistory(
            comment_id=locked_comment.id,
            user_id=current_user.id,
            version=next_version,
            action="UPDATED",
            content=content,
        )

        db.add(history)
        record_case_activity(
            db,
            case_id=locked_comment.case_id,
            actor_id=current_user.id,
            action="COMMENT_UPDATED",
            old_value={
                "comment_id": str(locked_comment.id),
            },
            new_value={
                "comment_id": str(locked_comment.id),
            },
        )
        db.commit()
        db.refresh(locked_comment)

        return locked_comment

    except Exception:
        db.rollback()
        raise


def delete_comment(
    db: Session,
    comment: CaseComment,
    current_user: User,
) -> CaseComment:
    """
    Realiza una eliminación lógica y registra la versión
    correspondiente en el historial.
    """

    try:
        locked_comment = get_locked_comment(
            db,
            comment.id,
        )

        if locked_comment.is_deleted:
            raise ValueError("Comment has already been deleted.")

        next_version = get_next_version(
            db,
            locked_comment.id,
        )

        locked_comment.is_deleted = True

        db.flush()

        history = CaseCommentHistory(
            comment_id=locked_comment.id,
            user_id=current_user.id,
            version=next_version,
            action="DELETED",
            content=locked_comment.content,
        )

        db.add(history)
        record_case_activity(
            db,
            case_id=locked_comment.case_id,
            actor_id=current_user.id,
            action="COMMENT_DELETED",
            old_value={
                "comment_id": str(locked_comment.id),
            },
        )
        db.commit()
        db.refresh(locked_comment)

        return locked_comment

    except Exception:
        db.rollback()
        raise


def get_comment_history(
    db: Session,
    comment_id: UUID,
) -> list[CaseCommentHistory]:
    """
    Obtiene todas las versiones de un comentario,
    incluyendo el usuario que realizó cada acción.
    """

    statement = (
        select(CaseCommentHistory)
        .options(
            selectinload(CaseCommentHistory.user),
        )
        .where(
            CaseCommentHistory.comment_id == comment_id
        )
        .order_by(
            CaseCommentHistory.version.asc()
        )
    )

    return list(db.scalars(statement).all())