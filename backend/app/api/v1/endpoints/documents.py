
import logging
from pathlib import Path
from uuid import UUID

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from fastapi.responses import FileResponse

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import get_settings
from app.core.roles import UserRole
from app.db.database import get_db
from app.models.user import User
from app.models.case_document import CaseDocument
from app.schemas.document import (
    PDFUploadItemResult,
    PDFUploadResponse,
    DocumentRead
)
from app.services.cases import get_visible_case_or_none
from app.services.documents import (
    DocumentValidationError,
    prepare_pdf,
)
from app.services.document_uploads import (
    DuplicateFilenameError,
    create_case_with_document,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)

settings = get_settings()


# =========================================================
# UPLOAD MULTIPLE PDF DOCUMENTS
# =========================================================

@router.post(
    "/upload",
    response_model=PDFUploadResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[
        Depends(
            require_roles(
                UserRole.MANAGER.value,
                UserRole.ADMIN.value,
            )
        )
    ],
)
async def upload_pdfs(
    files: Annotated[list[UploadFile], File(description="Select one or more PDF files")],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PDFUploadResponse:
    """
    Upload multiple PDF documents.

    Each valid PDF creates:
        - One Case
        - One CaseDocument

    Invalid files do not prevent other files from being processed.
    """

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one PDF file is required.",
        )

    if len(files) > settings.max_files_per_upload:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"A maximum of {settings.max_files_per_upload} "
                "files is allowed per request."
            ),
        )

    results: list[PDFUploadItemResult] = []

    for uploaded_file in files:

        # Avoid exposing directory components from a submitted filename.
        original_filename = (
            (uploaded_file.filename or "unknown")
            .replace("\\", "/")
            .split("/")[-1]
        )

        try:
            # -------------------------------------------------
            # 1. Validate and prepare the PDF.
            # -------------------------------------------------

            prepared_document = await prepare_pdf(uploaded_file)

            # -------------------------------------------------
            # 2. Create the case and its document.
            # -------------------------------------------------

            case, document = create_case_with_document(
                db=db,
                prepared_document=prepared_document,
                current_user=current_user,
            )

            # -------------------------------------------------
            # 3. Add successful result.
            # -------------------------------------------------

            results.append(
                PDFUploadItemResult(
                    filename=prepared_document.original_filename,
                    case_number=case.case_number,
                    success=True,
                    message="PDF uploaded and case created successfully.",
                )
            )

        except DocumentValidationError as exc:

            results.append(
                PDFUploadItemResult(
                    filename=original_filename,
                    case_number=None,
                    success=False,
                    message=str(exc),
                )
            )

        except DuplicateFilenameError:

            results.append(
                PDFUploadItemResult(
                    filename=original_filename,
                    case_number=None,
                    success=False,
                    message="A document with this filename already exists.",
                )
            )

        except IntegrityError:

            db.rollback()

            logger.exception(
                "Database integrity error while uploading %s",
                original_filename,
            )

            results.append(
                PDFUploadItemResult(
                    filename=original_filename,
                    case_number=None,
                    success=False,
                    message="The document could not be saved because of a database constraint.",
                )
            )

        except Exception:

            db.rollback()

            logger.exception(
                "Unexpected error while uploading %s",
                original_filename,
            )

            results.append(
                PDFUploadItemResult(
                    filename=original_filename,
                    case_number=None,
                    success=False,
                    message="An unexpected error occurred while processing this file.",
                )
            )

        finally:
            await uploaded_file.close()

    # ---------------------------------------------------------
    # 4. Calculate upload statistics.
    # ---------------------------------------------------------

    succeeded = sum(
        1 for result in results if result.success
    )

    failed = len(results) - succeeded

    return PDFUploadResponse(
        results=results,
        total=len(results),
        succeeded=succeeded,
        failed=failed,
    )


# =========================================================
# LIST DOCUMENTS ASSOCIATED WITH A CASE
# =========================================================

@router.get(
    "/case/{case_id}",
    response_model=list[DocumentRead],
)
def list_case_documents(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentRead]:
    """
    List all documents associated with a case.

    SALES:
        Can only list documents belonging to assigned cases.

    MANAGER / ADMIN:
        Can list documents belonging to any case.
    """

    # 1. Verify that the user can access the case.

    case = get_visible_case_or_none(
        db=db,
        case_id=case_id,
        current_user=current_user,
    )

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    # 2. Retrieve associated documents.

    statement = (
        select(CaseDocument)
        .where(CaseDocument.case_id == case_id)
        .order_by(CaseDocument.uploaded_at.desc())
    )

    documents = db.scalars(statement).all()

    return list(documents)

# =========================================================
# VIEW PRIVATE PDF DOCUMENT
# =========================================================

@router.get(
    "/{document_id}/view",
    response_class=FileResponse,
)
def view_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    View a PDF document in the browser.

    Access is granted only if the current user can access
    the case associated with the document.
    """

    # ---------------------------------------------------------
    # 1. Retrieve document metadata.
    # ---------------------------------------------------------

    from app.models.case_document import CaseDocument

    document = db.get(CaseDocument, document_id)

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # ---------------------------------------------------------
    # 2. Verify access to the associated case.
    # ---------------------------------------------------------

    case = get_visible_case_or_none(
        db=db,
        case_id=document.case_id,
        current_user=current_user,
    )

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # ---------------------------------------------------------
    # 3. Resolve private storage path.
    # ---------------------------------------------------------

    storage_dir = Path(settings.storage_path).resolve()

    file_path = (
        storage_dir / document.storage_key
    ).resolve()

    # ---------------------------------------------------------
    # 4. Prevent directory traversal.
    # ---------------------------------------------------------

    try:
        file_path.relative_to(storage_dir)

    except ValueError:
        logger.error(
            "Invalid storage path for document %s",
            document.id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid document storage reference.",
        )

    # ---------------------------------------------------------
    # 5. Check physical file existence.
    # ---------------------------------------------------------

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found.",
        )

    # ---------------------------------------------------------
    # 6. Return PDF as inline content.
    # ---------------------------------------------------------

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        content_disposition_type="inline",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
