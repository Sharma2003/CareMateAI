import os, shutil
from uuid import UUID, uuid4
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from entities.DocumentStore import DocumentStore, DocumentOwnerType, DocumentCategory

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

ALLOWED_MIME = {
    "application/pdf", "image/jpeg", "image/png", "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/gif", "image/webp",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


async def save_document(
    db: Session,
    file: UploadFile,
    owner_id: UUID,
    owner_type: DocumentOwnerType,
    category: DocumentCategory,
    title: str,
    description: str = "",
    prescription_id: UUID = None,
) -> DocumentStore:
    # Validate
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Build path
    sub = "doctors" if owner_type == DocumentOwnerType.doctor else "patients"
    folder = os.path.join(UPLOAD_ROOT, sub, str(owner_id))
    os.makedirs(folder, exist_ok=True)

    ext = os.path.splitext(file.filename or "file")[1] or ".bin"
    stored_name = f"{uuid4()}{ext}"
    full_path = os.path.join(folder, stored_name)
    rel_path = os.path.join(sub, str(owner_id), stored_name)

    with open(full_path, "wb") as f:
        f.write(contents)

    doc = DocumentStore(
        owner_id=owner_id,
        owner_type=owner_type,
        category=category,
        title=title,
        description=description,
        file_name=file.filename,
        file_path=rel_path,
        mime_type=file.content_type,
        file_size_bytes=str(len(contents)),
        prescription_id=prescription_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(db: Session, owner_id: UUID, owner_type: DocumentOwnerType):
    return db.query(DocumentStore).filter(
        DocumentStore.owner_id == owner_id,
        DocumentStore.owner_type == owner_type,
    ).order_by(DocumentStore.uploaded_at.desc()).all()


def delete_document(db: Session, doc_id: UUID, owner_id: UUID):
    doc = db.query(DocumentStore).filter(DocumentStore.id == doc_id, DocumentStore.owner_id == owner_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Delete file from disk
    full_path = os.path.join(UPLOAD_ROOT, doc.file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(doc)
    db.commit()
    return {"message": "Deleted"}


def get_document_path(db: Session, doc_id: UUID, owner_id: UUID = None):
    q = db.query(DocumentStore).filter(DocumentStore.id == doc_id)
    if owner_id:
        q = q.filter(DocumentStore.owner_id == owner_id)
    doc = q.first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    full_path = os.path.join(UPLOAD_ROOT, doc.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return full_path, doc.file_name, doc.mime_type


def get_document_path_no_auth(db: Session, doc_id: UUID):
    """Get document path without ownership check — UUID acts as capability token."""
    doc = db.query(DocumentStore).filter(DocumentStore.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    full_path = os.path.join(UPLOAD_ROOT, doc.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return full_path, doc.file_name, doc.mime_type
