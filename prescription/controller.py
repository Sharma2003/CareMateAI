from fastapi import APIRouter
from uuid import UUID

from auth.service import CurrentUser
from database.core import DbSession
from helper.ensure import ensure_doctor_role, ensure_patient_role
from prescription.model import PrescriptionCreate, PrescriptionResponse
from prescription.service import (
    create_or_update_prescription,
    get_prescription_by_booking,
    get_prescriptions_for_patient,
    get_prescriptions_for_doctor,
)

router = APIRouter(prefix="/prescription", tags=["prescription"])


@router.post("/", response_model=PrescriptionResponse)
def upsert_prescription(
    payload: PrescriptionCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return create_or_update_prescription(db=db, doctor_id=current_user.get_uuid(), payload=payload)


@router.get("/booking/{booking_id}", response_model=PrescriptionResponse | None)
def get_by_booking(booking_id: UUID, current_user: CurrentUser, db: DbSession):
    return get_prescription_by_booking(db=db, booking_id=booking_id)


@router.get("/doctor/all", response_model=list[PrescriptionResponse])
def doctor_prescriptions(current_user: CurrentUser, db: DbSession):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return get_prescriptions_for_doctor(db=db, doctor_id=current_user.get_uuid())


@router.get("/patient/all", response_model=list[PrescriptionResponse])
def patient_prescriptions(current_user: CurrentUser, db: DbSession):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    return get_prescriptions_for_patient(db=db, patient_id=current_user.get_uuid())
