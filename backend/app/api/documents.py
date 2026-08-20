import logging

from app.models.document_chunk import DocumentChunk
from app.services.chunking_service import (
    create_concept_chunks,
    create_pdf_concept_chunks,
)


from app.models.quiz import Quiz
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.local_profile import get_local_user
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentResponse,
    PastedDocumentRequest,
)
from app.services.pdf_service import extract_pdf_text

from fastapi import HTTPException
from app.schemas.explanation import (
    ExplanationRequest,
    ExplanationResponse,
)
from app.schemas.focus import FocusBreakdown
from app.services.ai_service import generate_explanation, generate_focus_breakdown


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)

logger = logging.getLogger(__name__)



@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile = File(...),
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    extracted_pdf = await extract_pdf_text(file)

    try:
        document = Document(
            filename=file.filename or "untitled.pdf",
            extracted_text=extracted_pdf.full_text,
            owner_id=current_user.id,
        )

        database.add(document)

        # Generates document.id without committing yet.
        database.flush()

        concept_chunks = create_pdf_concept_chunks(
            pages=extracted_pdf.pages,
        )

        for chunk in concept_chunks:
            database.add(
                DocumentChunk(
                    document_id=document.id,
                    page_number=chunk.page_number,
                    chunk_index=chunk.chunk_index,
                    title=chunk.title,
                    content=chunk.content,
                    word_count=chunk.word_count,
                    char_count=chunk.char_count,
                )
            )

        # Save the document and all chunks together.
        database.commit()
        database.refresh(document)

    except Exception:
        database.rollback()
        logger.exception("Document upload could not be saved")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be saved",
        )

    return {
        "id": document.id,
        "filename": document.filename,
        "character_count": len(document.extracted_text),
        "uploaded_at": document.uploaded_at,
        "owner_id": document.owner_id,
    }
    


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    documents = database.scalars(
        select(Document)
        .where(Document.owner_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
    ).all()

    return [
        {
            "id": document.id,
            "filename": document.filename,
            "character_count": len(document.extracted_text),
            "uploaded_at": document.uploaded_at,
            "owner_id": document.owner_id,
        }
        for document in documents
    ]

@router.post(
    "/paste",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def paste_document(
    request: PastedDocumentRequest,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    cleaned_title = request.title.strip()
    cleaned_text = request.text.strip()

    if not cleaned_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title cannot be empty",
        )

    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notes cannot be empty",
        )

    try:
        document = Document(
            filename=cleaned_title,
            extracted_text=cleaned_text,
            owner_id=current_user.id,
        )

        database.add(document)
        database.flush()

        concept_chunks = create_concept_chunks(
            page_text=cleaned_text,
            page_number=1,
        )

        for chunk in concept_chunks:
            database.add(
                DocumentChunk(
                    document_id=document.id,
                    page_number=chunk.page_number,
                    chunk_index=chunk.chunk_index,
                    title=chunk.title,
                    content=chunk.content,
                    word_count=chunk.word_count,
                    char_count=chunk.char_count,
                )
            )

        database.commit()
        database.refresh(document)

    except Exception:
        database.rollback()
        logger.exception("Pasted notes could not be saved")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be saved",
        )

    return {
        "id": document.id,
        "filename": document.filename,
        "character_count": len(document.extracted_text),
        "uploaded_at": document.uploaded_at,
        "owner_id": document.owner_id,
    }

@router.get("/{document_id}")
def get_document(
    document_id: int,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    document = database.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return {
        "id": document.id,
        "filename": document.filename,
        "extracted_text": document.extracted_text,
        "character_count": len(document.extracted_text),
        "uploaded_at": document.uploaded_at,
        "owner_id": document.owner_id,
    }

@router.get("/{document_id}/chunks")
def get_document_chunks(
    document_id: int,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    document = database.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    chunks = database.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    ).all()

    return [
        {
            "id": chunk.id,
            "document_id": chunk.document_id,
            "page_number": chunk.page_number,
            "chunk_index": chunk.chunk_index,
            "title": chunk.title,
            "content": chunk.content,
            "word_count": chunk.word_count,
            "char_count": chunk.char_count,
        }
        for chunk in chunks
    ]


@router.post(
    "/{document_id}/focus",
    response_model=FocusBreakdown,
)
def create_focus_breakdown(
    document_id: int,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    document = database.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    try:
        return generate_focus_breakdown(document.extracted_text)
    except Exception as error:
        logger.exception("Focus breakdown generation failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Focus mode could not prepare this material. Please try again.",
        ) from error


@router.post(
    "/{document_id}/explain",
    response_model=ExplanationResponse,
)
def explain_document_section(
    document_id: int,
    request: ExplanationRequest,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    document = database.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    section_text = request.selected_text.strip()

    if not section_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No section was selected",
        )

    explanation = generate_explanation(
        section_text=section_text,
        explanation_mode=request.mode,
    )

    return {
        "document_id": document.id,
        "mode": request.mode,
        "explanation": explanation,
    }

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    document = database.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    database.delete(document)
    database.commit()
