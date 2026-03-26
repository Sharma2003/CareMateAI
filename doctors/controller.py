<<<<<<< HEAD
from fastapi import APIRouter, Depends, HTTPException
from database.core import DbSession, engine, Base
from auth.service import CurrentUser
from entities.Users import User
from entities.Doctor import Doctor
from doctors.model import DoctorDetails, DoctorProfileResponse
from doctors.service import get_doctor_profile, upsert_doctor_profile
from sqlalchemy.orm import Session


router = APIRouter(
    prefix="/doctor",
    tags=["doctor"]
)

def ensure_doctor_role(current_user : CurrentUser, db : Session):
    user = db.query(User).filter(User.id == current_user.get_uuid()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User Not Found")
    if user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only Doctor can access this resource")
    return user

@router.get("/profile",response_model=DoctorProfileResponse)
def get_profile(current_user : CurrentUser, db : DbSession):
    ensure_doctor_role(current_user=current_user,db=db)
    return get_doctor_profile(current_user.get_uuid(),db=db)

@router.post("/profile",response_model=DoctorProfileResponse)
def create_profie(current_user : CurrentUser, payload:DoctorDetails, db:DbSession):
    ensure_doctor_role(current_user=current_user,db=db)
    return upsert_doctor_profile(current_user.get_uuid(),db=db,data=payload)

# @router.put("/profile",response_model=DoctorProfileResponse)
# def update_profile(current_user : CurrentUser, db : DbSession, payload : DoctorDetails):
#     ensure_doctor_role(current_user=current_user.get_uuid(),db=db)
#     return update_doctor_profile(current_user=current_user.get_uuid(),db=db,data=payload)
=======
from fastapi import APIRouter
from database.core import DbSession
from auth.service import CurrentUser
from doctors.model import DoctorProfileDetails, DoctorProfileResponse, DoctorProfileUpdate
from doctors.service import get_doctor_profile, upsert_doctor_profile, update_doctor_profile
from helper.ensure import ensure_doctor_role

router = APIRouter(
    prefix="/doctor",
    tags=["doctor"],
)


@router.post("/profile", response_model=DoctorProfileResponse)
def create_profile(current_user: CurrentUser, payload: DoctorProfileDetails, db: DbSession):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return upsert_doctor_profile(current_user.get_uuid(), db=db, data=payload)


@router.patch("/profile", response_model=DoctorProfileResponse)
def update_profile(
    current_user: CurrentUser, db: DbSession, payload: DoctorProfileUpdate
):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return update_doctor_profile(user_id=current_user.get_uuid(), data=payload, db=db)


@router.get("/profile", response_model=DoctorProfileResponse)
def get_profile(current_user: CurrentUser, db: DbSession):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return get_doctor_profile(current_user.get_uuid(), db=db)
>>>>>>> 561e94f (MVP version 1)
