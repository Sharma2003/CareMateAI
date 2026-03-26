from fastapi import APIRouter
from uuid import UUID

from helper.ensure import ensure_doctor_role
from database.core import DbSession
from auth.service import CurrentUser
from consultation_notes.model import ConsultationNoteResponse, ConsultationNoteCreate
from consultation_notes.service import write_notes

router = APIRouter(
<<<<<<< HEAD
    prefix="/cousltation-notes",
    tags=["Cosnultation-Notes"]
=======
    prefix="/consltation-notes",
    tags=["consultation-notes"]
>>>>>>> 561e94f (MVP version 1)
)

@router.post("/write-notes",response_model=ConsultationNoteResponse)
def create(db:DbSession, current_user:CurrentUser, payload:ConsultationNoteCreate, consultation_id:UUID):
    ensure_doctor_role(db=db,current_user=current_user.get_uuid())
    return write_notes(db=db, payload=payload, consultation_id=consultation_id, doctor_id=current_user.get_uuid())