from uuid import UUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

from entities.Patients import Patient
from entities.Users import User
from patients.model import PatientDetails, PatientProfileResponse, PatientDetailsUpdated


def get_patient_profile(user_id: UUID, db: Session) -> PatientProfileResponse:
    patient = db.query(Patient).filter(Patient.id == user_id).first()
    if not patient:
        logging.warning(f"Patient ID not found: {user_id}")
        raise HTTPException(status_code=404, detail="Patient profile not found")

    return PatientProfileResponse.model_validate(patient)


def upsert_patient_profile(
    user_id: UUID, data: PatientDetails, db: Session
) -> PatientProfileResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"User ID not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    try:
        patient = db.query(Patient).filter(Patient.id == user_id).first()
        if patient:
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(patient, field, value)
        else:
            patient = Patient(id=user_id, **data.model_dump())
            db.add(patient)
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        patient = db.query(Patient).filter(Patient.id == user_id).first()

    return PatientProfileResponse.model_validate(patient)


def update_patient_profile(
    user_id: UUID, db: Session, data: PatientDetailsUpdated
) -> PatientProfileResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"Patient ID not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    patient = db.query(Patient).filter(Patient.id == user_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    try:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(patient, field, value)
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not update patient profile")

    return PatientProfileResponse.model_validate(patient)