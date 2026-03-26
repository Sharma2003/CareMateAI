import logging
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from entities.FacilityMaster import Facility
from facilities.model import FacilityResponse, FacilitiesDetails
from entities.Users import User
from entities.Doctor import Doctor


def create_doctor_facility(db: Session, payload: FacilitiesDetails, doctor_id: UUID):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=400, detail="Doctor profile not found. Please create your profile first.")
    try:
        facility = Facility(doctor_id=doctor_id,**payload.model_dump())
        db.add(facility)
        db.commit()
        db.refresh(facility)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Unable to create facility")

    return FacilityResponse.model_validate(facility,from_attributes=True)


def get_facilities_for_doctor(db: Session, doctor_id: UUID) -> FacilityResponse:
    facilities = db.query(Facility).filter(Facility.doctor_id == doctor_id).all()

    if not facilities:
        logging.warning(f"No facilities found for doctor: {doctor_id}")
        raise HTTPException(status_code=404, detail="No facilities found")

    return [FacilityResponse.model_validate(f, from_attributes=True) for f in facilities]


def update_facility(db: Session, facility_id: UUID, payload: FacilitiesDetails):

    facility = db.query(Facility).filter(Facility.id == facility_id).first()

    if not facility:
        logging.warning(f"Facility not found for update: {facility_id}")
        raise HTTPException(status_code=404, detail="Facility not found")

    try:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(facility,field,value)
        
        db.commit()
        db.refresh(facility)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400,detail="Could not update facility")
    
    return FacilityResponse.model_validate(facility,from_attributes=True)


def delete_facility(db: Session, facility_id: UUID) -> dict:
    facility = db.query(Facility).filter(Facility.id == facility_id).first()

    if not facility:
        logging.warning(f"Facility delete failed, not found: {facility_id}")
        raise HTTPException(status_code=404, detail="Facility not found")
    
    try:
        db.delete(facility)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400,detail="Facility can not be deleted")
    return {"message": "Facility deleted successfully", "facility_id": str(facility_id)}
