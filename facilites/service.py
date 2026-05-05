import logging
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session

from entities.FacilityMaster import Facility
from facilites.model import FacilityResponse, FacilitiesDetails


def create_doctor_facility(db: Session, payload: FacilitiesDetails, doctor_id: UUID):

    facility = Facility(
        doctor_id=doctor_id,
        facilityName=payload.facilityName,
        facilityType=payload.facilityType,
        facilityAddress=payload.facilityAddress,
        city=payload.city,
        state=payload.state,
        postalCode=payload.postalCode
    )

    db.add(facility)
    db.commit()
    db.refresh(facility)

    return FacilityResponse.model_validate(facility,from_attributes=True)


def get_facilities_for_doctor(db: Session, doctor_id: UUID) -> FacilityResponse:
    facilities = db.query(Facility).filter(Facility.doctor_id == doctor_id).all()

    if not facilities:
        logging.warning(f"No facilities found for doctor: {doctor_id}")
        raise HTTPException(status_code=404, detail="No facilities found")

    return [FacilityResponse.model_validate(f) for f in facilities]


def update_facility(db: Session, facility_id: UUID, payload: FacilitiesDetails):

    facility = db.query(Facility).filter(Facility.id == facility_id).first()

    if not facility:
        logging.warning(f"Facility not found for update: {facility_id}")
        raise HTTPException(status_code=404, detail="Facility not found")

    facility.facilityName = payload.facilityName
    facility.facilityType = payload.facilityType
    facility.facilityAddress = payload.facilityAddress
    facility.city = payload.city
    facility.state = payload.state
    facility.postalCode = payload.postalCode

    db.commit()
    db.refresh(facility)

    return FacilityResponse.model_validate(facility,from_attributes=True)


def delete_facility(db: Session, facility_id: UUID) -> dict:
    facility = db.query(Facility).filter(Facility.id == facility_id).first()

    if not facility:
        logging.warning(f"Facility delete failed, not found: {facility_id}")
        raise HTTPException(status_code=404, detail="Facility not found")

    db.delete(facility)
    db.commit()

    return {"message": "Facility deleted successfully", "facility_id": str(facility_id)}

