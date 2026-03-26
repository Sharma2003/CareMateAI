from fastapi import HTTPException
from sqlalchemy.orm import Session
from entities.FacilityMaster import Facility
from entities.Doctor import Doctor
from doctorFinder.model import FacilityItem, DoctorItem
from helper.slot_generator import slot_generator
import logging
from uuid import UUID
<<<<<<< HEAD
=======
from datetime import date
>>>>>>> 561e94f (MVP version 1)


def list_facilities(db: Session) -> list[FacilityItem]:
    facilities = db.query(Facility).all()

    if not facilities:
        logging.warning("No facilities available")
        raise HTTPException(404, "No facilities found")

    return [FacilityItem.model_validate(f, from_attributes=True) for f in facilities]


def list_doctors_by_facility(db: Session, facility_id: str) -> list[DoctorItem]:
    doctors = (
        db.query(Doctor)
        .join(Facility, Facility.doctor_id == Doctor.id)
        .filter(Facility.id == facility_id)
        .all()
    )

    if not doctors:
        raise HTTPException(404, "No doctors found in this facility")

    return [DoctorItem.model_validate(d, from_attributes=True) for d in doctors]


<<<<<<< HEAD
def list_doctor_slots(db: Session, doctor_id: UUID):

    slots = slot_generator(db=db, current_user=doctor_id)
=======
def list_doctor_slots(
    db: Session,
    doctor_id: UUID,
    target_date: date = None,
    facility_id: UUID = None,
):
    slots = slot_generator(
        db=db,
        current_user=doctor_id,
        target_date=target_date,
        facility_id=facility_id,
    )
>>>>>>> 561e94f (MVP version 1)
    return slots
