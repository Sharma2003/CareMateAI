from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from uuid import UUID

from entities.DoctorFacility import DoctorAvailability
from entities.FacilityMaster import Facility
from scheduling.model import (
    DoctorAvailabilityCreate,
    DoctorAvailabilityUpdate,
    DoctorAvailabilityResponse,
)


def _check_schedule_overlap(
    db: Session,
    doctor_id: UUID,
    day_of_week: int,
    start_time,
    end_time,
    exclude_id: UUID = None,
    facility_id: UUID = None,
):
    """
    Raise 409 if the new/updated schedule overlaps ANY existing schedule
    for this doctor on the same day — across ALL facilities.
    """
    query = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.day_of_week == day_of_week,
        DoctorAvailability.start_time < end_time,
        DoctorAvailability.end_time > start_time,
        DoctorAvailability.is_active == True,
    )
    if exclude_id is not None:
        query = query.filter(DoctorAvailability.id != exclude_id)

    conflict = query.first()
    if conflict:
        # Fetch facility name for a helpful message
        fac = db.query(Facility).filter(Facility.id == conflict.facility_id).first()
        fac_name = fac.facilityName if fac else str(conflict.facility_id)
        raise HTTPException(
            status_code=409,
            detail=(
                f"Schedule overlaps with an existing slot at '{fac_name}' "
                f"({conflict.start_time.strftime('%H:%M')}–{conflict.end_time.strftime('%H:%M')}) "
                f"on the same day. A doctor cannot be at multiple facilities at overlapping times."
            ),
        )


def create_doctor_schedule(
    db: Session,
    doctor_id: UUID,
    facility_id: UUID,
    payload: DoctorAvailabilityCreate,
) -> DoctorAvailabilityResponse:
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    _check_schedule_overlap(
        db, doctor_id, payload.day_of_week, payload.start_time, payload.end_time,
        facility_id=facility_id
    )
    try:
        doctor_available = DoctorAvailability(
            facility_id=facility_id, doctor_id=doctor_id, **payload.model_dump()
        )
        db.add(doctor_available)
        db.commit()
        db.refresh(doctor_available)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Unable to schedule")

    return DoctorAvailabilityResponse.model_validate(doctor_available)


def get_doctor_availability(db: Session, doctor_id: UUID) -> list[DoctorAvailabilityResponse]:
    schedules = (
        db.query(DoctorAvailability)
        .filter(DoctorAvailability.doctor_id == doctor_id)
        .order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time)
        .all()
    )
    if not schedules:
        raise HTTPException(status_code=404, detail="No availability found for this doctor")
    return [DoctorAvailabilityResponse.model_validate(s) for s in schedules]


def update_doctor_availability(
    db: Session,
    facility_id: UUID,
    doctor_id: UUID,
    payload: DoctorAvailabilityUpdate,
) -> DoctorAvailabilityResponse:
    schedule = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.facility_id == facility_id,
            DoctorAvailability.doctor_id == doctor_id,
        )
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found for this facility")

    _check_schedule_overlap(
        db, schedule.doctor_id, payload.day_of_week,
        payload.start_time, payload.end_time,
        exclude_id=schedule.id, facility_id=facility_id
    )
    try:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(schedule, field, value)
        db.commit()
        db.refresh(schedule)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not update schedule")
    return DoctorAvailabilityResponse.model_validate(schedule)


def delete_doctor_availability(db: Session, doctor_id: UUID, scheduling_id: UUID) -> dict:
    schedule = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.id == scheduling_id,
            DoctorAvailability.doctor_id == doctor_id,
        )
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    try:
        db.delete(schedule)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Schedule cannot be deleted")
    return {"message": "Doctor availability deleted successfully"}
