from uuid import UUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging
<<<<<<< HEAD
from entities.Doctor import Doctor
from entities.Users import User
from doctors.model import DoctorDetails, DoctorProfileResponse

def get_doctor_profile(user_id : UUID, db: Session):
    doctor = db.query(Doctor).filter(Doctor.id == user_id).first()
    if not doctor:
        logging.warning(f"Doctor Profile Not Found ID: {user_id}")
        raise HTTPException(status_code=404, detail="Doctor profile not fuound")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    data = {
    **doctor.__dict__,
    "email": user.email,
    "userid": user.userid
}
    
    return DoctorProfileResponse.model_validate(data,from_attributes=True)


def upsert_doctor_profile(user_id : UUID, data : DoctorDetails, db : Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"Doctor ID Not Found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    
=======

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

>>>>>>> 561e94f (MVP version 1)
    try:
        doctor = db.query(Doctor).filter(Doctor.id == user_id).first()
        if doctor:
            for field, value in data.model_dump(exclude_unset=True).items():
<<<<<<< HEAD
                setattr(doctor,field,value)
        else:
            doctor = Doctor(id=user_id,**data.model_dump())
            db.add(doctor)
        db.commit()
        db.refresh(doctor)
    except IntegrityError as e:
        db.rollback()
        doctor = db.query(Doctor).filter(Doctor.id == user_id).first()

    data = {
        **doctor.__dict__,
        "email" : user.email,
        "userid" : user.userid
    }
    return DoctorProfileResponse.model_validate(data,from_attributes=True)


# def update_doctor_profile(user_id : UUID, data : DoctorDetails, db : Session):
#     get_doctor_profile(user_id=user_id, db=db)
#     doctor = db.query(Doctor).filter(Doctor.id == user_id).first()
#     user = db.query(User).filter(User.id == user_id).first()
#     if not user and not doctor:
#         logging.warning(f"Doctor ID Not Found: {user_id}")
#         raise HTTPException(status_code=404, detail="User not found")
#     if doctor:
#         doctor.first_name = data.first_name
#         doctor.last_name = data.last_name
#         doctor.gender = data.gender
#         doctor.DOB = data.DOB
#         doctor.phoneNo = data.phoneNo
#         doctor.YOE = data.YOE
#     db.commit()
#     return DoctorProfileResponse.model_validate(doctor)
=======
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
>>>>>>> 561e94f (MVP version 1)
