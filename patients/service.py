from uuid import UUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
<<<<<<< HEAD
from fastapi import HTTPException, status
from pydantic import ValidationError
=======
from fastapi import HTTPException
import logging
>>>>>>> 561e94f (MVP version 1)

from entities.Patients import Patient
from entities.Users import User
from patients.model import PatientDetails, PatientProfileResponse, PatientDetailsUpdated
<<<<<<< HEAD
import logging

def get_patient_profile(user_id: UUID, db : Session):
    try:
        patient = db.query(Patient).filter(Patient.id == user_id).first()
        if not patient:
            logging.warning(f"patient ID Not found: {user_id}")
            raise HTTPException(status_code=404, detail="Patient Profile Not Found")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User Not Found")
    except ValidationError as e:
        logging.error(e)
    except HTTPException as e:
        logging.error(e)
    return PatientProfileResponse.model_validate(
        {**patient.__dict__, "email" : user.email,"userid":user.userid},
        from_attributes=True
        )


def upsert_patient_profile(user_id : UUID, data: PatientDetails, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"patient ID Not found: {user_id}")
        raise HTTPException(status_code=404, detail="User Not Found")
=======


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
>>>>>>> 561e94f (MVP version 1)

    try:
        patient = db.query(Patient).filter(Patient.id == user_id).first()
        if patient:
            for field, value in data.model_dump(exclude_unset=True).items():
<<<<<<< HEAD
                setattr(patient,field,value)
        else:
            patient = Patient(id=user_id,**data.model_dump())
=======
                setattr(patient, field, value)
        else:
            patient = Patient(id=user_id, **data.model_dump())
>>>>>>> 561e94f (MVP version 1)
            db.add(patient)
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        patient = db.query(Patient).filter(Patient.id == user_id).first()

<<<<<<< HEAD
    return PatientProfileResponse.model_validate(
        {**patient.__dict__, "email" : user.email,"userid":user.userid},
        from_attributes=True
        )

# def update_patient_profile(user_id : UUID, db: Session, data : PatientDetails) -> PatientProfileResponse:
#     get_patient_profile(user_id=user_id, db=db)
#     user = db.query(User).filter(User.id == user_id).first()
#     patient = db.query(Patient).filter(Patient.id == user_id).first()
#     if patient:
#         patient.first_name = data.first_name
#         patient.last_name = data.last_name
#         patient.gender = data.gender
#         patient.DOB = data.DOB
#         patient.phoneNo = data.phoneNo
#         patient.bloodGroup = data.bloodGroup
#         patient.maritalStatus = data.maritalStatus
#         patient.emergencyContactName = data.emergencyContactName
#         patient.emergencyContactPhone = data.emergencyContactPhone
#     db.commit()
#     return PatientProfileResponse.model_validate(
#         {**patient.__dict__, "email" : user.email,"userid":user.userid},
#         from_attributes=True
#         )

def update_patient_profile(user_id:UUID, db:Session, data:PatientDetailsUpdated):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"Patient ID not found: {user_id}")
        HTTPException(status_code=404, detail=f"Patient ID not Found")

    try:
        patient = db.query(Patient).filter(Patient.id == user_id).first()
        if patient:
            for field, values in data.model_dump(exclude_unset=True).items():
                setattr(patient,field,values)
        
        db.commit()
        db.refresh(patient)

    except IntegrityError as e:
        db.rollback()
        patient = db.query(Patient).filter(Patient.id == user_id).first()

    return PatientDetailsUpdated.model_validate(
        {**patient.__dict__, "email": user.id,"userid":user.id}
        )
        
=======
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
>>>>>>> 561e94f (MVP version 1)
