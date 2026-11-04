
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.roles import UserRole
from app.db.database import get_db
from app.models.user import User
from app.schemas.comment import (
    CommentCreate,
    CommentRead,
    CommentUpdate,
    CommentHistoryRead,
)
from app.services.cases import get_visible_case_or_none
from app.services.comments import (
    create_comment,
    delete_comment,
    get_comments_by_case,
    get_comment_history,
    update_comment,
)


router = APIRouter(
    prefix="/cases",
    tags=["Case Comments"],
)


def role_value(user: User) -> str:
    role = user.role
    return role.value if hasattr(role, "value") else str(role)


def can_manage_comments(user: User) -> bool:
    return role_value(user) in {
        UserRole.MANAGER.value,
        UserRole.ADMIN.value,
    }


def verify_case_access(
    db: Session,
    case_id: UUID,
    current_user: User,
):
    case = get_visible_case_or_none(
        db=db,
        case_id=case_id,
        current_user=current_user,
    )

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    return case


def verify_comment_permission(
    comment,
    current_user: User,
):
    if (
        comment.user_id != current_user.id
        and not can_manage_comments(current_user)
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot modify this comment.",
        )


@router.get(
    "/{case_id}/comments",
    response_model=list[CommentRead],
)
def list_comments(
    case_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_case_access(db, case_id, current_user)

    return get_comments_by_case(
        db,
        case_id,
        skip,
        limit,
    )


@router.post(
    "/{case_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    case_id: UUID,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_case_access(db, case_id, current_user)

    return create_comment(
        db,
        case_id,
        current_user,
        payload.content,
    )


@router.patch(
    "/{case_id}/comments/{comment_id}",
    response_model=CommentRead,
)
def edit_comment(
    case_id: UUID,
    comment_id: UUID,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_case_access(db, case_id, current_user)

    from app.models.case_comment import CaseComment
    from sqlalchemy import select

    comment = db.scalar(
        select(CaseComment).where(
            CaseComment.id == comment_id,
            CaseComment.case_id == case_id,
            CaseComment.is_deleted.is_(False),
        )
    )

    if comment is None:
        raise HTTPException(404, "Comment not found.")

    verify_comment_permission(comment, current_user)

    return update_comment(
        db,
        comment,
        current_user,
        payload.content,
    )


@router.delete(
    "/{case_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_comment(
    case_id: UUID,
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_case_access(db, case_id, current_user)

    from app.models.case_comment import CaseComment
    from sqlalchemy import select

    comment = db.scalar(
        select(CaseComment).where(
            CaseComment.id == comment_id,
            CaseComment.case_id == case_id,
            CaseComment.is_deleted.is_(False),
        )
    )

    if comment is None:
        raise HTTPException(404, "Comment not found.")

    verify_comment_permission(comment, current_user)

    delete_comment(
        db,
        comment,
        current_user,
    )


@router.get(
    "/{case_id}/comments/{comment_id}/history",
    response_model=list[CommentHistoryRead],
)
def list_comment_history(
    case_id: UUID,
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_case_access(db, case_id, current_user)

    from app.models.case_comment import CaseComment
    from sqlalchemy import select

    comment = db.scalar(
        select(CaseComment).where(
            CaseComment.id == comment_id,
            CaseComment.case_id == case_id,
        )
    )

    if comment is None:
        raise HTTPException(404, "Comment not found.")

    return get_comment_history(db, comment_id)
