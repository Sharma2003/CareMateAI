from fastapi import HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import logging

from entities.Booking import Booking
from entities.DoctorFacility import DoctorAvailability
from booking.model import BookingCreate, BookingResponse
from datetime import datetime, date
from zoneinfo import ZoneInfo

import requests as _requests
import logging as _logging

def _send_sms_notification(phone: str, message: str) -> None:
    """
    Send SMS via Textbelt (free tier: 1 SMS/day with key='textbelt').
    Falls back gracefully if SMS fails — never blocks booking.
    For production, replace 'textbelt' key with a paid Textbelt key or Twilio.
    """
    # Normalize Indian phone numbers (+91 prefix)
    normalized = phone.strip()
    if normalized.startswith("0"):
        normalized = "+91" + normalized[1:]
    elif not normalized.startswith("+"):
        normalized = "+91" + normalized

    try:
        resp = _requests.post(
            "https://textbelt.com/text",
            data={"phone": normalized, "message": message, "key": "textbelt"},
            timeout=5,
        )
        result = resp.json()
        if result.get("success"):
            _logging.info(f"SMS sent to {normalized}")
        else:
            _logging.warning(f"SMS not sent to {normalized}: {result.get('error', 'unknown')}")
    except Exception as e:
        _logging.warning(f"SMS send failed for {phone}: {e}")



IST = ZoneInfo("Asia/Kolkata")


def _validate_against_availability(
    db: Session,
    doctor_id: UUID,
    facility_id: UUID,
    booking_date: date,
    start_time,
    end_time,
):
    """
    Validate that the requested booking falls within the doctor's
    published availability for the given facility and day of week.
    """
    day_of_week = booking_date.weekday()  # 0=Monday … 6=Sunday

    availability = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.facility_id == facility_id,
            DoctorAvailability.day_of_week == day_of_week,
            DoctorAvailability.is_active == True,
        )
        .first()
    )

    if not availability:
        raise HTTPException(
            status_code=400,
            detail=f"Doctor is not available at this facility on {booking_date.strftime('%A')}",
        )

    # Check that the booking time falls within the availability window
    if start_time < availability.start_time:
        raise HTTPException(
            status_code=400,
            detail=f"Booking start time {start_time} is before the doctor's availability ({availability.start_time})",
        )
    if end_time > availability.end_time:
        raise HTTPException(
            status_code=400,
            detail=f"Booking end time {end_time} is after the doctor's availability ({availability.end_time})",
        )

    # Validate that slot duration matches the doctor's configured slot size
    requested_minutes = (
        datetime.combine(date.today(), end_time) - datetime.combine(date.today(), start_time)
    ).total_seconds() / 60

    if int(requested_minutes) != availability.slot_duration_minutes:
        raise HTTPException(
            status_code=400,
            detail=f"Requested slot duration ({int(requested_minutes)} min) does not match "
                   f"the doctor's slot size ({availability.slot_duration_minutes} min)",
        )

    return availability


def book_appointment(
    db: Session,
    currentUser: UUID,
    doctor_id: UUID,
    facility_id: UUID,
    payload: BookingCreate,
):
    # Validate against doctor availability (day, time window, slot size)
    _validate_against_availability(
        db, doctor_id, facility_id, payload.booking_date, payload.start_ts, payload.end_ts
    )

    # Build timezone-aware datetime objects
    start_ts = datetime.combine(payload.booking_date, payload.start_ts).replace(tzinfo=IST)
    end_ts = datetime.combine(payload.booking_date, payload.end_ts).replace(tzinfo=IST)

    # Prevent booking in the past
    now = datetime.now(IST)
    if start_ts < now:
        raise HTTPException(
            status_code=400,
            detail="Cannot book a slot in the past",
        )

    # Check for overlapping bookings
    overlapping = (
        db.query(Booking)
        .filter(
            Booking.doctor_id == doctor_id,
            Booking.status == "booked",
            Booking.start_ts < end_ts,
            Booking.end_ts > start_ts,
        )
        .first()
    )

    if overlapping:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    booking_appointment = Booking(
        facility_id=facility_id,
        doctor_id=doctor_id,
        patient_id=currentUser,
        start_ts=start_ts,
        end_ts=end_ts,
    )

    db.add(booking_appointment)
    db.commit()
    db.refresh(booking_appointment)

    # Send SMS notification to patient
    try:
        from entities.Patients import Patient as _Pat
        from entities.Doctor import Doctor as _Doc
        pat = db.query(_Pat).filter(_Pat.id == currentUser).first()
        doc = db.query(_Doc).filter(_Doc.id == doctor_id).first()
        if pat and pat.phoneNo:
            msg = (
                f"CareMate Appointment Confirmed!\n"
                f"Doctor: Dr. {doc.first_name} {doc.last_name}\n"
                f"Date: {payload.booking_date.strftime('%d %b %Y')}\n"
                f"Time: {payload.start_ts.strftime('%I:%M %p')} - {payload.end_ts.strftime('%I:%M %p')}\n"
                f"Please arrive 10 min early."
            )
            _send_sms_notification(pat.phoneNo, msg)
    except Exception:
        pass

    return BookingResponse.model_validate(booking_appointment, from_attributes=True)


def get_patient_appointments(db: Session, patient_id: UUID):
    patient = (
        db.query(Booking)
        .filter(Booking.patient_id == patient_id)
        .order_by(Booking.start_ts)
        .all()
    )
    return [BookingResponse.model_validate(b, from_attributes=True) for b in patient]


def get_doctor_appointments(db: Session, doctor_id: UUID):
    from entities.Patients import Patient
    results = (
        db.query(Booking, Patient.first_name, Patient.last_name)
        .outerjoin(Patient, Booking.patient_id == Patient.id)
        .filter(Booking.doctor_id == doctor_id)
        .order_by(Booking.start_ts)
        .all()
    )
    responses = []
    for booking, first_name, last_name in results:
        resp = BookingResponse.model_validate(booking, from_attributes=True)
        if first_name and last_name:
            resp.patient_name = f"{first_name} {last_name}"
        elif first_name:
            resp.patient_name = first_name
        responses.append(resp)
    return responses


def update_booking_status(db: Session, booking_id: UUID, doctor_id: UUID, payload):
    from booking.model import BookingStatusUpdate, BookingResponse
    from entities.Prescription import Prescription
    from datetime import datetime

def update_booking_status(db: Session, booking_id: UUID, doctor_id: UUID, payload):
    from booking.model import BookingStatusUpdate, BookingResponse
    from entities.Prescription import Prescription
    from datetime import timezone as _tz

    def _to_aware(dt):
        if dt is None:
            return None
        if hasattr(dt, 'tzinfo') and dt.tzinfo is None:
            return dt.replace(tzinfo=_tz.utc)
        return dt

    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.doctor_id == doctor_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = payload.status

    # Only set start_ts if not already recorded (first time starting)
    if payload.consultation_start_ts and not booking.consultation_start_ts:
        booking.consultation_start_ts = _to_aware(payload.consultation_start_ts)

    if payload.consultation_end_ts:
        end_ts = _to_aware(payload.consultation_end_ts)
        booking.consultation_end_ts = end_ts
        # Use DB-persisted start_ts for accurate duration
        start_ts = _to_aware(booking.consultation_start_ts)
        if start_ts:
            delta = end_ts - start_ts
            booking.consultation_duration_minutes = max(1, int(delta.total_seconds() / 60))

    db.commit()
    db.refresh(booking)

    from entities.Patients import Patient as PatientEntity
    resp = BookingResponse.model_validate(booking)
    patient = db.query(PatientEntity).filter(PatientEntity.id == booking.patient_id).first()
    if patient:
        resp.patient_name = f"{patient.first_name} {patient.last_name}"
    pres = db.query(Prescription).filter(Prescription.booking_id == booking_id).first()
    resp.has_prescription = pres is not None
    return resp
