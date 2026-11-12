
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.case_document import CaseDocument
from app.models.case_status import CaseStatus
from app.models.user import User

from app.services.activity import record_case_activity
from app.services.case_numbers import generate_case_number
from app.services.documents import (
    PreparedDocument,
    store_pdf_file,
    delete_stored_file,
)


class DuplicateFilenameError(Exception):
    """Raised when a document filename already exists."""


def create_case_with_document(
    db: Session,
    prepared_document: PreparedDocument,
    current_user: User,
) -> tuple[Case, CaseDocument]:
    """
    Create one case and associate one PDF document.

    The following operations are committed in one transaction:

        - Case creation.
        - Document metadata creation.
        - CASE_CREATED activity.
        - DOCUMENT_UPLOADED activity.

    The physical PDF is removed if the database transaction fails.
    """

    stored_file_path: Path | None = None
    transaction_committed = False

    try:
        # -----------------------------------------------------
        # 1. Check whether the normalized filename already exists.
        # -----------------------------------------------------

        existing_document = db.scalar(
            select(CaseDocument.id).where(
                CaseDocument.normalized_filename
                == prepared_document.normalized_filename
            )
        )

        if existing_document is not None:
            raise DuplicateFilenameError(
                "A document with this filename already exists."
            )

        # -----------------------------------------------------
        # 2. Get the default case status.
        # -----------------------------------------------------

        pending_status = db.scalar(
            select(CaseStatus).where(
                CaseStatus.code == "PENDING",
                CaseStatus.is_active.is_(True),
            )
        )

        if pending_status is None:
            raise RuntimeError(
                "The PENDING status has not been initialized."
            )

        # -----------------------------------------------------
        # 3. Generate and create the case.
        # -----------------------------------------------------

        case = Case(
            case_number=generate_case_number(db),
            status_id=pending_status.id,
            assigned_to_id=None,
            created_by_id=current_user.id,
        )

        db.add(case)
        db.flush()

        # -----------------------------------------------------
        # 4. Store the physical PDF.
        # -----------------------------------------------------

        storage_key, stored_file_path = store_pdf_file(
            prepared_document.content
        )

        # -----------------------------------------------------
        # 5. Create document metadata.
        # -----------------------------------------------------

        document = CaseDocument(
            case_id=case.id,
            original_filename=prepared_document.original_filename,
            normalized_filename=prepared_document.normalized_filename,
            storage_key=storage_key,
            content_type="application/pdf",
            file_size=prepared_document.file_size,
            sha256_hash=prepared_document.sha256_hash,
            uploaded_by_id=current_user.id,
        )

        db.add(document)
        db.flush()

        # -----------------------------------------------------
        # 6. Record case creation activity.
        # -----------------------------------------------------

        record_case_activity(
            db,
            case_id=case.id,
            actor_id=current_user.id,
            action="CASE_CREATED",
            new_value={
                "case_number": case.case_number,
                "status": pending_status.code,
                "source": "DOCUMENT_UPLOAD",
            },
        )

        # -----------------------------------------------------
        # 7. Record document upload activity.
        # -----------------------------------------------------

        record_case_activity(
            db,
            case_id=case.id,
            actor_id=current_user.id,
            action="DOCUMENT_UPLOADED",
            new_value={
                "document_id": str(document.id),
                "filename": document.original_filename,
                "file_size": document.file_size,
                "content_type": document.content_type,
            },
        )

        # -----------------------------------------------------
        # 8. Commit all database operations together.
        # -----------------------------------------------------

        db.commit()
        transaction_committed = True

        # -----------------------------------------------------
        # 9. Refresh database objects.
        # -----------------------------------------------------

        db.refresh(case)
        db.refresh(document)

        return case, document

    except Exception:
        db.rollback()

        # Only delete the physical PDF if the database
        # transaction was not committed.
        if (
            not transaction_committed
            and stored_file_path is not None
        ):
            delete_stored_file(stored_file_path)

        raise
