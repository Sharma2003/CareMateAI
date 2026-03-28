from fastapi import APIRouter
from auth.service import CurrentUser
from database.core import DbSession
from booking.model import BookingCreate, BookingResponse, BookingStatusUpdate
from booking.service import book_appointment, get_doctor_appointments, get_patient_appointments, update_booking_status
from helper.ensure import ensure_patient_role, ensure_doctor_role
from uuid import UUID

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
    payload: BookingCreate,
):
    ensure_patient_role(db=db, current_user=currentuser.get_uuid())
    return book_appointment(
        db=db,
        currentUser=currentuser.get_uuid(),
        doctor_id=doctor_id,
        facility_id=facility_id,
        payload=payload,
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
