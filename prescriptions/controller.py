from fastapi import APIRouter
from uuid import UUID
from database.core import DbSession
from auth.service import CurrentUser
from helper.ensure import ensure_doctor_role, ensure_patient_role
from prescriptions.model import PrescriptionCreate, PrescriptionResponse
from prescriptions.service import (
    create_prescription, get_prescription_by_booking,
    get_prescriptions_for_patient, get_prescriptions_for_doctor,
)

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.post("/", response_model=PrescriptionResponse)
def create(payload: PrescriptionCreate, db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return create_prescription(db=db, payload=payload, doctor_id=current_user.get_uuid())


@router.get("/booking/{booking_id}", response_model=PrescriptionResponse)
def by_booking(booking_id: UUID, db: DbSession, current_user: CurrentUser):
    return get_prescription_by_booking(db=db, booking_id=booking_id)


@router.get("/my-prescriptions", response_model=list[PrescriptionResponse])
def patient_rx(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    return get_prescriptions_for_patient(db=db, patient_id=current_user.get_uuid())


@router.get("/doctor-prescriptions", response_model=list[PrescriptionResponse])
def doctor_rx(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return get_prescriptions_for_doctor(db=db, doctor_id=current_user.get_uuid())
