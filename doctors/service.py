from uuid import UUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

from entities.Doctor import Doctor
from entities.Users import User
from doctors.model import DoctorProfileDetails, DoctorProfileResponse, DoctorProfileUpdate


def get_doctor_profile(user_id: UUID, db: Session) -> DoctorProfileResponse:
    doctor = db.query(Doctor).filter(Doctor.id == user_id).first()
    if not doctor:
        logging.warning(f"Doctor profile not found, ID: {user_id}")
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    return DoctorProfileResponse.model_validate(doctor)


def upsert_doctor_profile(
    user_id: UUID, data: DoctorProfileDetails, db: Session
) -> DoctorProfileResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"User ID not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    try:
        doctor = db.query(Doctor).filter(Doctor.id == user_id).first()
        if doctor:
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(doctor, field, value)
        else:
            doctor = Doctor(id=user_id, **data.model_dump())
            db.add(doctor)
        db.commit()
        db.refresh(doctor)
    except IntegrityError:
        db.rollback()
        doctor = db.query(Doctor).filter(Doctor.id == user_id).first()

    return DoctorProfileResponse.model_validate(doctor)


def update_doctor_profile(
    db: Session, user_id: UUID, data: DoctorProfileUpdate
) -> DoctorProfileResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    doctor = db.query(Doctor).filter(Doctor.id == user_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    try:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(doctor, field, value)
        db.commit()
        db.refresh(doctor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not update doctor profile")

    return DoctorProfileResponse.model_validate(doctor)