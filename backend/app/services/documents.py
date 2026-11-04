import hashlib
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4
from io import BytesIO

from fastapi import UploadFile
from pypdf import PdfReader

from app.core.config import get_settings


settings = get_settings()


class DocumentValidationError(Exception):
    """Raised when an uploaded document does not meet requirements."""


@dataclass(frozen=True, slots=True)
class PreparedDocument:
    original_filename: str
    normalized_filename: str
    content: bytes
    file_size: int
    sha256_hash: str


def normalize_filename(filename: str) -> str:
    """
    Normalize a filename for global, case-insensitive uniqueness.
    """

    filename = unicodedata.normalize("NFKC", filename)
    filename = filename.replace("\\", "/")
    filename = filename.split("/")[-1].strip()

    if not filename:
        raise DocumentValidationError("Filename cannot be empty.")

    return filename.casefold()


async def prepare_pdf(upload: UploadFile) -> PreparedDocument:
    """
    Read and validate one PDF file.
    """

    if not upload.filename:
        raise DocumentValidationError("Filename is required.")

    original_filename = unicodedata.normalize(
        "NFKC",
        upload.filename.replace("\\", "/").split("/")[-1].strip(),
    )

    if not original_filename:
        raise DocumentValidationError("Filename cannot be empty.")

    if len(original_filename) > 255:
        raise DocumentValidationError(
            "Filename cannot exceed 255 characters."
        )

    normalized_filename = normalize_filename(original_filename)

    if not normalized_filename.endswith(".pdf"):
        raise DocumentValidationError("Only PDF files are allowed.")

    max_size = settings.max_pdf_size_bytes

    # Always read from the beginning of the uploaded file.
    await upload.seek(0)

    # Read at most max_size + 1 to detect oversized files.
    content = await upload.read(max_size + 1)

    if not content:
        raise DocumentValidationError("The file is empty.")

    if len(content) > max_size:
        raise DocumentValidationError(
            f"File exceeds the maximum size of {max_size} bytes."
        )

    # Validate the actual PDF structure.
    try:
        reader = PdfReader(BytesIO(content), strict=True)

        if reader.is_encrypted:
            raise DocumentValidationError(
                "Password-protected PDFs are not allowed."
            )

        if len(reader.pages) == 0:
            raise DocumentValidationError(
                "PDF must contain at least one page."
            )

    except DocumentValidationError:
        raise
    except Exception as exc:
        raise DocumentValidationError(
            "The uploaded file is not a valid PDF."
        ) from exc

    sha256_hash = hashlib.sha256(content).hexdigest()

    return PreparedDocument(
        original_filename=original_filename,
        normalized_filename=normalized_filename,
        content=content,
        file_size=len(content),
        sha256_hash=sha256_hash,
    )


def store_pdf_file(content: bytes) -> tuple[str, Path]:
    """
    Store a PDF using an internally generated UUID.

    Returns:
        A relative storage key and the absolute file path.
    """

    document_id = uuid4()

    storage_root = Path(settings.storage_path).resolve()

    relative_path = (
        Path("cases")
        / document_id.hex[:2]
        / f"{document_id}.pdf"
    )

    destination = storage_root / relative_path

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_file = destination.with_suffix(".tmp")

    try:
        with temporary_file.open("xb") as file:
            file.write(content)

        temporary_file.replace(destination)

    except Exception:
        temporary_file.unlink(missing_ok=True)
        raise

    storage_key = relative_path.as_posix()

    return storage_key, destination


def delete_stored_file(file_path: Path) -> None:
    """
    Remove a stored file when its database transaction fails.
    """

    file_path.unlink(missing_ok=True)