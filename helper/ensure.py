from fastapi import HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from entities.Users import User
from entities.FacilityMaster import Facility

def ensure_patient_role(db : Session, current_user : UUID):
    user = db.query(User).filter(User.id == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if user.role != "patient".lower():
        raise HTTPException(status_code=403, detail="Only Patient Can Access This Resources")
    
    return user 

<<<<<<< HEAD
def ensure_doctor_role(db : Session, current_user : UUID):
=======
def ensure_doctor_role(db : Session, current_user:UUID):
>>>>>>> 561e94f (MVP version 1)
    user = db.query(User).filter(User.id == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if user.role != "doctor".lower():
        raise HTTPException(status_code=403, detail="Only Doctor Can Access This Resources")
    
    return user 

def ensure_doctor_facility(db : Session, facility_id : UUID):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404 ,detail="Facility Details Not Found")   
    
    return facility


def ensure_doctor_username(db : Session, username: str):
    user = db.query(User).filter(User.userid == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not Authorized")
    
    return user 