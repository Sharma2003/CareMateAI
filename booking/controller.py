from fastapi import APIRouter, Query
from auth.service import CurrentUser
from database.core import DbSession
from booking.model import BookingCreate, BookingResponse, BookingStatusUpdate
from booking.service import book_appointment, get_doctor_appointments, get_patient_appointments, update_booking_status, search_appointments_for_doctor, get_all_patients_for_facility
from helper.ensure import ensure_patient_role, ensure_doctor_role
from uuid import UUID
from typing import Optional
router = APIRouter(
    prefix="/booking",
    tags=["booking"],
)


@router.post("/create", response_model=BookingResponse)
def create(
    db: DbSession,
    currentuser: CurrentUser,
    facility_id: UUID,
    doctor_id: UUID,
    payload: BookingCreate
):
    ensure_patient_role(db=db, current_user=currentuser.get_uuid())
    return book_appointment(
        db=db,
        currentUser=currentuser.get_uuid(),
        doctor_id=doctor_id,
        facility_id=facility_id,
        payload=payload
    )


@router.get("/patient-appointments", response_model=list[BookingResponse])
def my_appointments(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db, current_user.get_uuid())
    return get_patient_appointments(db, current_user.get_uuid())


@router.get("/doctor-appointments", response_model=list[BookingResponse])
def doctor_appointments(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db, current_user.get_uuid())
    return get_doctor_appointments(db, current_user.get_uuid())


@router.patch("/{booking_id}/status", response_model=BookingResponse)
def update_status(
    booking_id: UUID,
    payload: BookingStatusUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    ensure_doctor_role(db, current_user.get_uuid())
    return update_booking_status(db=db, booking_id=booking_id, doctor_id=current_user.get_uuid(), payload=payload)


@router.get("/search-for-specific-appointment")
def search_appointments(db:DbSession, doctor_id: CurrentUser, q: Optional[str] = Query(None, description="Search by facility name, postal code or facility type")):
    ensure_doctor_role(db=db, current_user=doctor_id.get_uuid())
    return search_appointments_for_doctor(db=db,doctor_id=doctor_id.get_uuid(),querry=q or "")


@router.get("/search-for-specific-appointment/{facility_id}")
def get_patients_appointment(db:DbSession, doctor_id : CurrentUser, facility_id:str):
    ensure_doctor_role(db=db, current_user=doctor_id.get_uuid())
    return get_all_patients_for_facility(db=db,doctor_id=doctor_id.get_uuid(),facility_id=facility_id)