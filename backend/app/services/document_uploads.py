from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.case_document import CaseDocument
from app.models.case_status import CaseStatus
from app.models.user import User

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

    The case and document are committed in the same
    database transaction.
    """

    stored_file_path: Path | None = None

    try:
        # 1. Check whether the normalized filename already exists.
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

        # 2. Get the default case status.
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

        # 3. Generate the internal case number.
        case = Case(
            case_number=generate_case_number(db),
            status_id=pending_status.id,
            assigned_to_id=None,
            created_by_id=current_user.id,
        )

        db.add(case)
        db.flush()

        # 4. Store the PDF outside the database.
        storage_key, stored_file_path = store_pdf_file(
            prepared_document.content
        )

        # 5. Create the document metadata.
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

        # 6. Commit case and document together.
        db.commit()

        db.refresh(case)
        db.refresh(document)

        return case, document

    except Exception:
        db.rollback()

        # If the database transaction fails, remove the physical file.
        if stored_file_path is not None:
            delete_stored_file(stored_file_path)

        raise