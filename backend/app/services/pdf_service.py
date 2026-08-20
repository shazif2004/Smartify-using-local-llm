import re
from dataclasses import dataclass
from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader


MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@dataclass
class ExtractedPDF:
    full_text: str
    pages: list[dict[str, int | str]]


async def extract_pdf_text(file: UploadFile) -> ExtractedPDF:
    """
    Validate a PDF and extract text page by page.

    Returns:
        ExtractedPDF containing:
        1. The complete document text
        2. Individual pages with page numbers
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported",
        )

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF must be 25 MB or smaller",
        )

    try:
        reader = PdfReader(BytesIO(contents))

        extracted_pages: list[dict[str, int | str]] = []
        full_text_parts: list[str] = []

        for page_number, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""

            page_text = re.sub(
                r"[\x00-\x08\x0B\x0C\x0E-\x1F]",
                "",
                page_text,
            ).strip()

            extracted_pages.append(
                {
                    "page_number": page_number,
                    "text": page_text,
                }
            )

            if page_text:
                full_text_parts.append(page_text)

        full_text = "\n\n".join(full_text_parts).strip()

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The PDF could not be processed",
        ) from error

    if not full_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text was found in the PDF",
        )

    await file.seek(0)

    return ExtractedPDF(
        full_text=full_text,
        pages=extracted_pages,
    )