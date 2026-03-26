import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse
from uuid import UUID
from typing import Optional
from database.core import DbSession
from auth.service import CurrentUser
from helper.ensure import ensure_doctor_role, ensure_patient_role
from documents.model import DocumentResponse
from documents.service import save_document, list_documents, delete_document, get_document_path
from entities.DocumentStore import DocumentOwnerType, DocumentCategory

router = APIRouter(prefix="/documents", tags=["documents"])


# ── Doctor uploads ──────────────────────────────────────────
@router.post("/doctor/upload", response_model=DocumentResponse)
async def doctor_upload(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("certificate"),
    description: str = Form(""),
):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    try:
        cat = DocumentCategory(category)
    except ValueError:
        cat = DocumentCategory.other_doctor
    doc = await save_document(
        db=db, file=file, owner_id=current_user.get_uuid(),
        owner_type=DocumentOwnerType.doctor, category=cat,
        title=title, description=description,
    )
    return DocumentResponse.model_validate(doc)


@router.get("/doctor/list", response_model=list[DocumentResponse])
def doctor_list(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    docs = list_documents(db, current_user.get_uuid(), DocumentOwnerType.doctor)
    return [DocumentResponse.model_validate(d) for d in docs]


# ── Patient uploads ─────────────────────────────────────────
@router.post("/patient/upload", response_model=DocumentResponse)
async def patient_upload(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("lab_report"),
    description: str = Form(""),
    prescription_id: Optional[str] = Form(None),
):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    try:
        cat = DocumentCategory(category)
    except ValueError:
        cat = DocumentCategory.other_patient
    rx_id = UUID(prescription_id) if prescription_id else None
    doc = await save_document(
        db=db, file=file, owner_id=current_user.get_uuid(),
        owner_type=DocumentOwnerType.patient, category=cat,
        title=title, description=description, prescription_id=rx_id,
    )
    return DocumentResponse.model_validate(doc)


@router.get("/patient/list", response_model=list[DocumentResponse])
def patient_list(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    docs = list_documents(db, current_user.get_uuid(), DocumentOwnerType.patient)
    return [DocumentResponse.model_validate(d) for d in docs]


# Doctor view patient docs (for referral test results)
@router.get("/doctor/patient/{patient_id}/docs", response_model=list[DocumentResponse])
def doctor_view_patient_docs(patient_id: UUID, db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    docs = list_documents(db, patient_id, DocumentOwnerType.patient)
    return [DocumentResponse.model_validate(d) for d in docs]


# ── Download — token can be passed as query param for direct link access ──
@router.get("/download/{doc_id}")
def download(
    doc_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Download a document. Auth token must be provided in Authorization header.
    For browser direct links, use /download/{id}?token=... 
    """
    full_path, file_name, mime_type = get_document_path(db, doc_id)
    return FileResponse(
        path=full_path,
        filename=file_name,
        media_type=mime_type or "application/octet-stream",
    )


@router.get("/view/{doc_id}")
def view_doc(
    doc_id: UUID,
    db: DbSession,
    request: Request,
):
    """
    View a document inline — no auth required (uses signed URL pattern via doc_id UUID).
    The UUID is unguessable so acts as a capability token.
    """
    from documents.service import get_document_path_no_auth
    full_path, file_name, mime_type = get_document_path_no_auth(db, doc_id)
    return FileResponse(
        path=full_path,
        filename=file_name,
        media_type=mime_type or "application/octet-stream",
        headers={"Content-Disposition": f"inline; filename=\"{file_name}\""},
    )


@router.delete("/delete/{doc_id}")
def delete(doc_id: UUID, db: DbSession, current_user: CurrentUser):
    return delete_document(db, doc_id, current_user.get_uuid())
