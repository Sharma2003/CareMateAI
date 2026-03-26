from fastapi import APIRouter
from auth.service import CurrentUser
from database.core import DbSession
<<<<<<< HEAD
from entities.Doctor import Doctor
from entities.Patients import Patient
from entities.FacilityMaster import Facility
from helper.ensure import ensure_patient_role
from booking.model import bookingSlotsResponse,bookingSlots
from booking.service import bookAppointment, get_doctor_appointments, get_patient_appointments
=======
from booking.model import BookingCreate, BookingResponse, BookingStatusUpdate
from booking.service import book_appointment, get_doctor_appointments, get_patient_appointments, update_booking_status
>>>>>>> 561e94f (MVP version 1)
from helper.ensure import ensure_patient_role, ensure_doctor_role
from uuid import UUID

router = APIRouter(
<<<<<<< HEAD
    prefix="/Booking",
    tags=["Booking"]
)

@router.post("/create", response_model=bookingSlotsResponse)
def create(db : DbSession, currentuser : CurrentUser, facility_id : UUID, doctor_id : UUID, payload:bookingSlots):
    ensure_patient_role(db=db, current_user=currentuser.get_uuid())
    return bookAppointment(db=db, currentUser=currentuser.get_uuid(), doctor_id=doctor_id, facility_id=facility_id, payload=payload)

@router.get("/patient-appointments")
=======
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
>>>>>>> 561e94f (MVP version 1)
def my_appointments(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db, current_user.get_uuid())
    return get_patient_appointments(db, current_user.get_uuid())

<<<<<<< HEAD
@router.get("/doctor-appointments")
def doctor_appointments(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db, current_user.get_uuid())
    return get_doctor_appointments(db, current_user.get_uuid())
=======

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
>>>>>>> 561e94f (MVP version 1)
